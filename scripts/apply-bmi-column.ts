import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sql = readFileSync(
  resolve(process.cwd(), "supabase/scripts/20260320_profiles_bmi.sql"),
  "utf8",
);

async function main() {
  const supabase = createClient(url, key);

  // Prefer PostgREST RPC if available
  for (const fn of ["exec_sql", "execute_sql"] as const) {
    const { error } = await supabase.rpc(fn as never, { sql } as never);
    if (!error) {
      console.log(`Applied via rpc ${fn}`);
      return;
    }
    console.log(`${fn}: ${error.message}`);
  }

  // Fallback: Management API SQL (needs access token — skip if missing)
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const projectRef = url.match(/https:\/\/([^.]+)\./)?.[1];
  if (token && projectRef) {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      },
    );
    const body = await res.text();
    console.log("mgmt", res.status, body.slice(0, 300));
    return;
  }

  console.log(
    "Could not auto-apply. Run supabase/scripts/20260320_profiles_bmi.sql in the Supabase SQL Editor.",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
