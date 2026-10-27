/**
 * Reset Superadmin Password
 * Usage: node scripts/reset-superadmin-password.mjs
 *
 * This script resets the password for the superadmin user.
 * Default credentials after reset:
 * Email: admin@gymjourney.com
 * Password: Admin@1234
 *
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
const SUPERADMIN_PASSWORD = "Admin@1234";

if (!SUPABASE_OK()) {
  console.error("Error: Missing or invalid Supabase credentials in .env");
  console.error("Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
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

async function main() {
  console.log("🔑 Resetting superadmin password...\n");

  // 1. Find the user
  console.log("Step 1: Finding auth user...");
  const existingCheck = await api("GET", `${adminUsers}?email=${encodeURIComponent(SUPERADMIN_EMAIL)}`);
  
  if (!existingCheck.ok || !existingCheck.json?.users?.length) {
    console.error("✗ Auth user not found:", existingCheck.status, existingCheck.text);
    throw new Error("Auth user not found");
  }

  const userId = existingCheck.json.users[0].id;
  console.log(`✓ Found auth user: ${userId}`);

  // 2. Reset the password
  console.log("Step 2: Resetting password...");
  const resetRes = await api(
    "PUT",
    `${adminUsers}/${userId}`,
    {
      password: SUPERADMIN_PASSWORD,
      email_confirm: true,
    }
  );

  if (!resetRes.ok) {
    console.error("✗ Failed to reset password:", resetRes.status, resetRes.text);
    throw new Error("Password reset failed");
  }

  console.log("✓ Password reset successfully");

  console.log("\n✅ Password reset complete!\n");
  console.log("==========================================");
  console.log("LOGIN CREDENTIALS:");
  console.log("==========================================");
  console.log(`Email: ${SUPERADMIN_EMAIL}`);
  console.log(`Password: ${SUPERADMIN_PASSWORD}`);
  console.log(`User ID: ${userId}`);
  console.log("==========================================");
  console.log("\n⚠️  IMPORTANT: Change your password immediately after first login!");
  console.log(`Login at: http://localhost:3000/login\n`);
}

main().catch((err) => {
  console.error("\n❌ PASSWORD RESET FAILED:", err.message);
  process.exit(1);
});
