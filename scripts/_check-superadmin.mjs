import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import path from "path";

const root = process.cwd();
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = "hassanrashid0018@gmail.com";
const { data: users } = await supabase.auth.admin.listUsers({ perPage: 200 });
const u = users?.users?.find((x) => x.email === email);
console.log("auth user:", u ? { id: u.id, email: u.email } : null);
if (!u) process.exit(1);

const { data: roles } = await supabase
  .from("user_roles")
  .select("role")
  .eq("user_id", u.id);
console.log("roles:", roles);

const { data: profile } = await supabase
  .from("profiles")
  .select("id, email, admin_approved, is_verified, gym_owner_id")
  .eq("id", u.id)
  .maybeSingle();
console.log("profile:", profile);
