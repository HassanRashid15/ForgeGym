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

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Accept: "application/json",
};

const settings = await fetch(
  `${url}/rest/v1/platform_settings?select=key,value&or=(key.eq.ai_speed_enabled,key.like.ai*)`,
  { headers },
).then((r) => r.json());
console.log("platform_settings ai rows:", JSON.stringify(settings, null, 2));

const all = await fetch(
  `${url}/rest/v1/platform_settings?select=key,value&order=key`,
  { headers },
).then((r) => r.json());
console.log(
  "all keys:",
  Array.isArray(all) ? all.map((r) => `${r.key}=${r.value}`) : all,
);
