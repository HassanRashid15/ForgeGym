/**
 * Seed Superadmin User
 * Usage:
 *   node scripts/seed-superadmin.mjs
 *   SUPERADMIN_EMAIL=you@example.com SUPERADMIN_PASSWORD='Secret123!' node scripts/seed-superadmin.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env or .env.local
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[m[1]] = val;
  }
}

loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const SUPERADMIN_EMAIL = (
  process.env.SUPERADMIN_EMAIL || "admin@gymjourney.com"
).trim().toLowerCase();
const SUPERADMIN_PASSWORD =
  process.env.SUPERADMIN_PASSWORD || "Admin@1234";
const SUPERADMIN_NAME =
  process.env.SUPERADMIN_NAME || "Super Admin";

if (!SUPABASE_OK()) {
  console.error("Error: Missing or invalid Supabase credentials in .env / .env.local");
  console.error("Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

function SUPABASE_OK() {
  const keyOk =
    SERVICE_KEY.startsWith("sb_secret_") || SERVICE_KEY.split(".").length === 3;
  return /^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL) && keyOk;
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function api(method, url, body, extraHeaders = {}) {
  const res = await fetch(url, {
    method,
    headers: { ...headers, ...extraHeaders },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-JSON body */
  }
  return { ok: res.ok, status: res.status, json, text };
}

const rest = (table, query = "") =>
  `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
const adminUsers = `${SUPABASE_URL}/auth/v1/admin/users`;

async function findUserByEmail(email) {
  // Prefer filter query; fall back to list scan if needed
  const filtered = await api(
    "GET",
    `${adminUsers}?page=1&per_page=200`,
  );
  if (filtered.ok && Array.isArray(filtered.json?.users)) {
    return filtered.json.users.find(
      (u) => String(u.email || "").toLowerCase() === email,
    );
  }
  return null;
}

async function main() {
  console.log("Seeding superadmin user...\n");
  console.log(`Email: ${SUPERADMIN_EMAIL}`);

  console.log("Step 1: Checking if auth user exists...");
  let existing = await findUserByEmail(SUPERADMIN_EMAIL);
  let userId;

  if (existing?.id) {
    userId = existing.id;
    console.log(`Auth user already exists: ${userId}`);
    console.log("Step 2: Updating password + confirming email...");
    const updateRes = await api("PUT", `${adminUsers}/${userId}`, {
      password: SUPERADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: SUPERADMIN_NAME },
    });
    if (!updateRes.ok) {
      console.error("Failed to update auth user:", updateRes.status, updateRes.text);
      throw new Error("Auth user update failed");
    }
    console.log("Auth user updated");
  } else {
    console.log("Step 2: Creating auth user...");
    const createRes = await api("POST", adminUsers, {
      email: SUPERADMIN_EMAIL,
      password: SUPERADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: SUPERADMIN_NAME },
    });

    if (!createRes.ok) {
      console.error("Failed to create auth user:", createRes.status, createRes.text);
      throw new Error("Auth user creation failed");
    }

    userId = createRes.json.id;
    console.log(`Auth user created: ${userId}`);
  }

  console.log("Step 3: Upserting profile...");
  const profilePayload = {
    id: userId,
    user_id: userId,
    email: SUPERADMIN_EMAIL,
    full_name: SUPERADMIN_NAME,
    is_super_admin: true,
    admin_approved: true,
    is_verified: true,
    account_status: "active",
    membership_status: "active",
    membership_type: "staff",
    updated_at: new Date().toISOString(),
  };

  const upsertRes = await api(
    "POST",
    rest("profiles"),
    profilePayload,
    {
      Prefer: "resolution=merge-duplicates,return=representation",
    },
  );

  if (!upsertRes.ok) {
    const patchRes = await api(
      "PATCH",
      rest("profiles", `user_id=eq.${userId}`),
      {
        is_super_admin: true,
        admin_approved: true,
        is_verified: true,
        account_status: "active",
        membership_status: "active",
        membership_type: "staff",
        full_name: SUPERADMIN_NAME,
        email: SUPERADMIN_EMAIL,
        updated_at: new Date().toISOString(),
      },
      { Prefer: "return=representation" },
    );
    if (!patchRes.ok) {
      console.error("Failed to upsert profile:", upsertRes.status, upsertRes.text);
      console.error("Patch also failed:", patchRes.status, patchRes.text);
      throw new Error("Profile upsert failed");
    }
    console.log("Profile updated");
  } else {
    console.log("Profile upserted");
  }

  console.log("Step 4: Ensuring admin role...");
  const roleRes = await api(
    "POST",
    rest("user_roles"),
    { user_id: userId, role: "admin" },
    { Prefer: "resolution=ignore-duplicates,return=minimal" },
  );

  if (!roleRes.ok && roleRes.status !== 409) {
    console.error("Failed to add admin role:", roleRes.status, roleRes.text);
    throw new Error("Admin role creation failed");
  }
  console.log("Admin role ensured");

  console.log("\nSuperadmin ready.");
  console.log("==========================================");
  console.log(`Email: ${SUPERADMIN_EMAIL}`);
  console.log(`Password: (the one you passed / default)`);
  console.log(`User ID: ${userId}`);
  console.log("==========================================");
}

main().catch((err) => {
  console.error("\nSEED FAILED:", err.message);
  process.exit(1);
});
