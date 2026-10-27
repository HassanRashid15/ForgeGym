/**
 * One-off: remove Supabase Storage objects belonging to wiped users.
 * Usage: node scripts/clean-storage.mjs <superadmin-user-uuid>
 *
 * - avatars: keeps {superadmin_id}/..., deletes other users' folders
 * - gym-media: deletes everything (owners were wiped from the DB; the
 *   promotions/ subtree is orphaned since promotions were deleted too)
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
const keyOk = SERVICE_KEY.startsWith("sb_secret_") || SERVICE_KEY.split(".").length === 3;
if (!SUPERADMIN || !/^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL) || !keyOk) {
  console.error("Usage: node scripts/clean-storage.mjs <superadmin-user-uuid>");
  process.exit(1);
}

const baseHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body === undefined
      ? baseHeaders
      : { ...baseHeaders, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, json, text: text.slice(0, 300) };
}

const storage = (p) => `${SUPABASE_URL}/storage/v1/${p}`;

/** Recursively list real objects (folders have id === null) */
async function listObjects(bucket, prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const r = await api("POST", storage(`object/list/${bucket}`), {
      prefix, limit: 1000, offset,
    });
    if (!r.ok) throw new Error(`list ${bucket}/${prefix}: ${r.status} ${r.text}`);
    const items = Array.isArray(r.json) ? r.json : [];
    for (const it of items) {
      if (it.id === null) out.push(...await listObjects(bucket, `${prefix}${it.name}/`));
      else out.push(`${prefix}${it.name}`);
    }
    if (items.length < 1000) return out;
  }
}

function keep(bucket, fullPath) {
  return bucket === "avatars" && fullPath.split("/")[0] === SUPERADMIN;
}

async function main() {
  const bucketsR = await api("GET", storage("bucket"));
  if (!bucketsR.ok) throw new Error(`list buckets: ${bucketsR.status} ${bucketsR.text}`);
  const buckets = (bucketsR.json ?? []).map((b) => b.name ?? b.id);
  console.log(`buckets: ${buckets.join(", ") || "(none)"}`);

  for (const bucket of buckets) {
    const objects = await listObjects(bucket);
    const del = objects.filter((p) => !keep(bucket, p));
    const kept = objects.filter((p) => keep(bucket, p));
    console.log(`${bucket}: ${objects.length} object(s) — keep ${kept.length}, delete ${del.length}`);
    for (const p of kept) console.log(`  keep ${p}`);
    if (del.length === 0) continue;
    let failed = 0;
    for (const p of del) {
      const encoded = p.split("/").map(encodeURIComponent).join("/");
      const r = await api("DELETE", storage(`object/${bucket}/${encoded}`));
      if (!r.ok) { failed += 1; console.log(`  FAILED ${p}: ${r.status} ${r.text}`); }
    }
    console.log(`  deleted ${del.length - failed}/${del.length} object(s) in ${bucket}`);
    if (failed > 0) throw new Error(`${failed} object(s) failed to delete in ${bucket}`);
  }

  for (const bucket of buckets) {
    console.log(`verify ${bucket}: ${(await listObjects(bucket)).length} object(s) left`);
  }
  console.log("done.");
}

main().catch((err) => {
  console.error("CLEANUP FAILED:", err.message);
  process.exit(1);
});
