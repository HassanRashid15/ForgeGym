// Assembles the baseline migration from section CSVs produced by
// `supabase db query --linked -o csv -f scripts/.baseline/secNN_*.sql`.
// Usage: node scripts/.baseline/assemble.mjs <tmpDirWithCsvs> <outMigrationPath>
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [, , tmpDir, outPath] = process.argv;

function cell(name) {
  let s = readFileSync(join(tmpDir, name), "utf8");
  s = s.slice(s.indexOf("\n") + 1).replace(/\n$/, "");
  if (s === "") return null;
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).replace(/""/g, '"');
  return s;
}

const titles = {
  sec01_extensions: "Extensions",
  sec02_types: "Enum types",
  sec03_tables: "Tables",
  sec04_functions: "Functions",
  sec05_constraints: "Constraints",
  sec06_indexes: "Indexes",
  sec07_triggers: "Triggers",
  sec08_rls: "Row level security",
  sec09_policies: "RLS policies (public + storage)",
  sec10_grants: "Grants",
  sec11_publications: "Realtime publications",
  sec12_buckets: "Storage buckets (seed)",
};

const files = readdirSync(tmpDir)
  .filter((f) => /^sec\d\d_.*\.csv$/.test(f))
  .sort();

const parts = [];
for (const f of files) {
  const key = f.replace(/\.csv$/, "");
  const ddl = cell(f);
  if (!ddl) {
    console.error(`warning: empty section ${f}`);
    continue;
  }
  parts.push(`-- ---------------------------------------------------------------------------\n-- ${titles[key] ?? key}\n-- ---------------------------------------------------------------------------\n\n${ddl}`);
  const stmts = (ddl.match(/^(CREATE|ALTER|GRANT|INSERT|COMMENT|DO)/gm) || []).length;
  console.log(`${f}: ${stmts} statements, ${ddl.length} chars`);
}

const header = `-- Schema baseline for the gym-journey-hub database.
-- Generated on ${new Date().toISOString().slice(0, 10)} from the live Supabase project
-- (ref in supabase/.temp/project-ref) using scripts/.baseline/sec*.sql via
-- "supabase db query --linked". Re-run those queries and this assembler to refresh.
--
-- This is the initial migration: it recreates the full public-schema DDL,
-- storage policies/buckets, grants, and realtime publication membership on a
-- fresh Supabase project. Later incremental migrations in this directory
-- apply on top and are written to be idempotent.
--
-- Applied AFTER this on a fresh project (all idempotent):
--   20261001_gym_operating_days_specific.sql
--   20261001110254_gym_opening_closing_times.sql
--   20261008_add_is_visitor.sql
--   20261009_add_account_freeze.sql
--   20261009_add_freeze_reason.sql
--   20261009_security_revoke_anon_rpc_grants.sql
--   20261009_security_storage_rls_superadmin_email.sql

`;

writeFileSync(outPath, header + parts.join("\n\n") + "\n");
console.log(`\nwrote ${outPath}`);
