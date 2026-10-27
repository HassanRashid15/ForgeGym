/**
 * Update Auth User Email
 * Usage: node scripts/update-auth-email.mjs
 *
 * This script updates the auth user's email to match the profile.
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Load environment variables from .env
for (const line of readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const TARGET_EMAIL = "admin@gymjourney.com";
const SUPERADMIN_PASSWORD = "Admin@1234";

if (!SUPABASE_OK()) {
  console.error("Error: Missing or invalid Supabase credentials in .env");
  process.exit(1);
}

function SUPABASE_OK() {
  const keyOk = SERVICE_KEY.startsWith("sb_secret_") || SERVICE_KEY.split(".").length === 3;
  return /^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL) && keyOk;
}

const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { ...headers, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON body */ }
  return { ok: res.ok, status: res.status, json, text };
}

const adminUsers = `${SUPABASE_URL}/auth/v1/admin/users`;
const rest = (table, query = "") =>
  `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;

async function main() {
  console.log("📧 Updating auth user email...\n");

  // 1. Find the profile with target email
  console.log("Step 1: Finding profile...");
  const profileCheck = await api(
    "GET",
    rest(`profiles?email=eq.${TARGET_EMAIL}`)
  );

  if (!profileCheck.ok || !profileCheck.json?.length) {
    console.error("✗ Profile not found for email:", TARGET_EMAIL);
    return;
  }

  const profile = profileCheck.json[0];
  const userId = profile.user_id;
  console.log(`✓ Found profile with user_id: ${userId}`);

  // 2. Get current auth user
  console.log("\nStep 2: Checking current auth user...");
  const authCheck = await api("GET", `${adminUsers}/${userId}`);
  
  if (!authCheck.ok) {
    console.error("✗ Auth user not found:", authCheck.status, authCheck.text);
    return;
  }

  const currentUser = authCheck.json;
  console.log(`  Current email: ${currentUser.email}`);

  if (currentUser.email === TARGET_EMAIL) {
    console.log("✓ Email already matches");
    return;
  }

  // 3. Update the auth user's email
  console.log("\nStep 3: Updating email to:", TARGET_EMAIL);
  const updateRes = await api(
    "PUT",
    `${adminUsers}/${userId}`,
    {
      email: TARGET_EMAIL,
      email_confirm: true,
      password: SUPERADMIN_PASSWORD,
    }
  );

  if (!updateRes.ok) {
    console.error("✗ Failed to update email:", updateRes.status, updateRes.text);
    throw new Error("Email update failed");
  }

  console.log("✓ Email updated successfully");

  // 4. Verify
  console.log("\nStep 4: Verifying update...");
  const verifyRes = await api("GET", `${adminUsers}/${userId}`);
  
  if (verifyRes.ok) {
    const verifiedUser = verifyRes.json;
    console.log(`  New email: ${verifiedUser.email}`);
    console.log(`  Email confirmed: ${verifiedUser.email_confirmed_at ? "✓ Yes" : "✗ No"}`);
  }

  console.log("\n✅ Email update complete!\n");
  console.log("==========================================");
  console.log("LOGIN CREDENTIALS:");
  console.log("==========================================");
  console.log(`Email: ${TARGET_EMAIL}`);
  console.log(`Password: ${SUPERADMIN_PASSWORD}`);
  console.log(`User ID: ${userId}`);
  console.log("==========================================");
  console.log("\n⚠️  IMPORTANT: Change your password immediately after first login!");
  console.log(`Login at: http://localhost:3000/login\n`);
}

main().catch((err) => {
  console.error("\n❌ EMAIL UPDATE FAILED:", err.message);
  process.exit(1);
});
