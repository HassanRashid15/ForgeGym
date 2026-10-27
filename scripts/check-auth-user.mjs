/**
 * Check Auth User Status
 * Usage: node scripts/check-auth-user.mjs
 *
 * This script checks the status of the superadmin auth user.
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

const SUPERADMIN_EMAIL = "admin@gymjourney.com";

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
  console.log("🔍 Checking auth user status...\n");

  // 1. Check auth user
  console.log("Step 1: Auth user details:");
  const authCheck = await api("GET", `${adminUsers}?email=${encodeURIComponent(SUPERADMIN_EMAIL)}`);
  
  if (!authCheck.ok || !authCheck.json?.users?.length) {
    console.error("✗ Auth user not found");
    return;
  }

  const user = authCheck.json.users[0];
  console.log(`  ID: ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Email Confirmed: ${user.email_confirmed_at ? "✓ Yes" : "✗ No"}`);
  console.log(`  Created At: ${user.created_at}`);
  console.log(`  Last Sign In: ${user.last_sign_in_at || "Never"}`);
  console.log(`  Banned: ${user.banned_until ? "✗ Yes" : "✓ No"}`);

  // 2. Check profile
  console.log("\nStep 2: Profile details:");
  const profileCheck = await api(
    "GET",
    rest(`profiles?email=eq.${SUPERADMIN_EMAIL}`)
  );

  if (profileCheck.ok && profileCheck.json?.length > 0) {
    const profile = profileCheck.json[0];
    console.log(`  User ID: ${profile.user_id}`);
    console.log(`  Email: ${profile.email}`);
    console.log(`  Full Name: ${profile.full_name}`);
    console.log(`  Is Super Admin: ${profile.is_super_admin ? "✓ Yes" : "✗ No"}`);
    console.log(`  Admin Approved: ${profile.admin_approved ? "✓ Yes" : "✗ No"}`);
    console.log(`  Is Verified: ${profile.is_verified ? "✓ Yes" : "✗ No"}`);
    console.log(`  Account Status: ${profile.account_status}`);
    console.log(`  Membership Status: ${profile.membership_status}`);
  } else {
    console.log("✗ Profile not found");
  }

  // 3. Check roles
  console.log("\nStep 3: User roles:");
  const rolesCheck = await api(
    "GET",
    rest(`user_roles?user_id=eq.${user.id}`)
  );

  if (rolesCheck.ok && rolesCheck.json?.length > 0) {
    rolesCheck.json.forEach((r) => {
      console.log(`  - ${r.role}`);
    });
  } else {
    console.log("✗ No roles found");
  }

  // 4. Check if email needs confirmation
  if (!user.email_confirmed_at) {
    console.log("\n⚠️  WARNING: Email is not confirmed. This may prevent login.");
    console.log("   The password reset script should have auto-confirmed it.");
  }
}

main().catch((err) => {
  console.error("\n❌ CHECK FAILED:", err.message);
  process.exit(1);
});
