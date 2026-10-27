/**
 * Backfill gyms.operating_days_specific / open-close from auth user_metadata
 * when gyms row is missing schedule fields.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import path from "path";

const root = process.cwd();
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, ""),
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: gyms, error } = await supabase
  .from("gyms")
  .select(
    "owner_user_id, name, operating_days_specific, opening_time, closing_time, operating_days",
  );

if (error) {
  console.error(error);
  process.exit(1);
}

let updated = 0;
for (const gym of gyms || []) {
  const needsDays =
    !Array.isArray(gym.operating_days_specific) ||
    gym.operating_days_specific.length === 0;
  const needsHours = !gym.opening_time || !gym.closing_time;
  if (!needsDays && !needsHours) continue;

  const { data: authData } = await supabase.auth.admin.getUserById(
    gym.owner_user_id,
  );
  const m = authData?.user?.user_metadata || {};
  const patch = { updated_at: new Date().toISOString() };
  if (
    needsDays &&
    Array.isArray(m.gym_operating_days_specific) &&
    m.gym_operating_days_specific.length > 0
  ) {
    patch.operating_days_specific = m.gym_operating_days_specific;
    if (m.gym_operating_days != null) patch.operating_days = m.gym_operating_days;
  }
  if (needsHours) {
    if (m.gym_opening_time) patch.opening_time = m.gym_opening_time;
    if (m.gym_closing_time) patch.closing_time = m.gym_closing_time;
  }
  if (Object.keys(patch).length <= 1) continue;

  const { error: upErr } = await supabase
    .from("gyms")
    .update(patch)
    .eq("owner_user_id", gym.owner_user_id);
  if (upErr) {
    console.error(gym.name, upErr.message);
    continue;
  }
  updated += 1;
  console.log("updated", gym.name, patch);
}

console.log(`done, updated ${updated}`);
