/**
 * One-off: wipe all production data except the superadmin account.
 * Usage: node scripts/wipe-non-superadmin-data.mjs <superadmin-user-uuid>
 *
 * - Deletes every auth user except the superadmin (FK cascades clear
 *   their profiles, gyms, workouts, notifications, etc.)
 * - Clears tables with no auth.users cascade: contact_messages,
 *   newsletter_subscriptions, public_traffic, platform_promotions
 *   (promotion_email_log cascades), admin_notifications not for superadmin
 * - Nulls profiles.approved_by pointing at deleted users (NO ACTION FK
 *   would otherwise block the auth user deletion)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

for (const line of readFileSync(path.join(root, ".env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const SUPERADMIN = process.argv[2];
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPERADMIN || !SUPABASE_OK()) {
  console.error("Usage: node scripts/wipe-non-superadmin-data.mjs <superadmin-user-uuid>");
  console.error("Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env");
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
  return { ok: res.ok, status: res.status, json, text: text.slice(0, 300) };
}

const rest = (table, query = "") =>
  `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
const adminUsers = `${SUPABASE_URL}/auth/v1/admin/users`;

async function main() {
  // 1. Find all auth users (paginated)
  const allUsers = [];
  let page = 1;
  for (;;) {
    const r = await api("GET", `${adminUsers}?page=${page}&per_page=200`);
    if (!r.ok) throw new Error(`list users page ${page}: ${r.status} ${r.text}`);
    const users = r.json?.users ?? [];
    allUsers.push(...users);
    if (users.length < 200) break;
    page += 1;
  }
  console.log(`auth users found: ${allUsers.length}`);
  const toDelete = allUsers.filter((u) => u.id !== SUPERADMIN);
  console.log(`keeping: ${SUPERADMIN}`);
  console.log(`deleting: ${toDelete.length} auth user(s)`);

  // 2. Unblock NO ACTION FK (profiles.approved_by)
  const unapprove = await api(
    "PATCH",
    rest("profiles", `approved_by=not.is.null&approved_by=not.eq.${SUPERADMIN}`),
    { approved_by: null },
  );
  console.log(`null approved_by: ${unapprove.ok ? "ok" : `FAILED ${unapprove.status} ${unapprove.text}`}`);

  // 3. Delete non-superadmin auth users (cascades public data)
  for (const u of toDelete) {
    // profiles.id REFERENCES auth.users(id) with no ON DELETE — must go first
    const prof = await api("DELETE", rest("profiles", `id=eq.${u.id}`));
    console.log(`delete profile ${u.id}: ${prof.ok ? "ok" : `FAILED ${prof.status} ${prof.text}`}`);
    if (!prof.ok) throw new Error("profile deletion failed — aborting");
    const r = await api("DELETE", `${adminUsers}/${u.id}`);
    console.log(`delete auth user ${u.id} (${u.email ?? "no email"}): ${r.ok ? "ok" : `FAILED ${r.status} ${r.text}`}`);
    if (!r.ok) throw new Error("auth user deletion failed — aborting before table wipes");
  }

  // 4. Wipe tables with no cascade to auth.users
  const wipes = [
    ["contact_messages", "id=not.is.null"],
    ["newsletter_subscriptions", "id=not.is.null"],
    ["public_traffic", "id=not.is.null"],
    ["platform_promotions", "id=not.is.null"], // promotion_email_log cascades
    ["admin_notifications", `id=not.is.null&recipient_user_id=not.eq.${SUPERADMIN}`],
  ];
  for (const [table, query] of wipes) {
    const r = await api("DELETE", rest(table, query));
    console.log(`wipe ${table}: ${r.ok ? "ok" : `FAILED ${r.status} ${r.text}`}`);
    if (!r.ok) throw new Error(`wipe of ${table} failed`);
  }

  console.log("done.");
}

main().catch((err) => {
  console.error("WIPE FAILED:", err.message);
  process.exit(1);
});
