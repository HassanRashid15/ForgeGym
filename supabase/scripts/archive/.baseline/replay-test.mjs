// Replay verification: applies the baseline migration + all incremental
// migrations to an in-memory PGlite database and compares object counts
// against the live Supabase project counts.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

const PREAMBLE = `
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE SCHEMA storage;
CREATE SCHEMA vault;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $u$ SELECT NULL::uuid $u$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $u$ SELECT NULL::text $u$;
CREATE OR REPLACE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $u$ SELECT NULL::text $u$;
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $u$ SELECT NULL::jsonb $u$;
CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner uuid,
  public boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb
);
CREATE OR REPLACE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $u$ SELECT string_to_array(name, '/') $u$;
`;

function splitSql(sql) {
  const stmts = [];
  let i = 0, start = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    if (c === "-" && sql[i + 1] === "-") {
      while (i < n && sql[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < n && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === "$") {
      const m = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        if (end === -1) throw new Error("unterminated dollar quote at " + i);
        i = end + tag.length;
        continue;
      }
    }
    if (c === "'") {
      const esc = /[Ee]$/.test(sql.slice(Math.max(0, start === i ? 0 : i - 1), i)) &&
        !/[A-Za-z_0-9]/.test(sql[i - 1] === undefined ? "" : sql[i - 2] || "");
      i++;
      while (i < n) {
        if (esc && sql[i] === "\\") { i += 2; continue; }
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") { i += 2; continue; }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === ";") {
      const stmt = sql.slice(start, i).trim();
      if (stmt) stmts.push(stmt);
      i++;
      start = i;
      continue;
    }
    i++;
  }
  const tail = sql.slice(start).trim();
  if (tail) stmts.push(tail);
  return stmts;
}

const db = new PGlite();
const failures = [];

async function runStatement(stmt, source, idx) {
  await db.exec("BEGIN");
  try {
    await db.exec(stmt);
    await db.exec("COMMIT");
  } catch (e) {
    await db.exec("ROLLBACK");
    failures.push({ source, idx, error: String(e.message || e).split("\n")[0], stmt });
  }
}

async function runSql(sql, source) {
  const stmts = splitSql(sql);
  for (let i = 0; i < stmts.length; i++) {
    await runStatement(stmts[i], source, i);
  }
  return stmts.length;
}

async function scalar(q) {
  const r = await db.query(q);
  return Number(r.rows[0].c);
}

console.log("Setting up preamble stubs...");
await runSql(PREAMBLE, "preamble");
const preambleFailures = failures.splice(0);
if (preambleFailures.length) {
  console.error("Preamble failures (unexpected):", preambleFailures);
  process.exit(1);
}

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
let totalStmts = 0;
for (const f of files) {
  const before = failures.length;
  const n = await runSql(readFileSync(join(MIGRATIONS_DIR, f), "utf8"), f);
  totalStmts += n;
  console.log(`${f}: ${n} statements, ${failures.length - before} failure(s)`);
}

const baseline = "20260201000000_baseline_schema.sql";
const baselineFailures = failures.filter((f) => f.source === baseline);
const unexpected = baselineFailures.filter((f) => !f.stmt.includes("CREATE EXTENSION IF NOT EXISTS"));
// All CREATE EXTENSION lines are expected to possibly fail (PGlite lacks pg_stat_statements/supabase_vault etc.)
const extensionFailures = baselineFailures.filter((f) => f.stmt.includes("CREATE EXTENSION IF NOT EXISTS"));
const incFailures = failures.filter((f) => f.source !== baseline && f.source !== "preamble");

console.log("\n=== Replay summary ===");
console.log(`Total statements executed: ${totalStmts}`);
console.log(`Extension statements (expected may-fail): ${extensionFailures.length}`);
for (const f of extensionFailures) console.log(`  [ext-fail-ok] ${f.stmt.slice(0, 80)} -> ${f.error}`);
console.log(`Unexpected baseline failures: ${unexpected.length}`);
for (const f of unexpected) console.log(`  [UNEXPECTED] ${f.source}#${f.idx}: ${f.error}\n    ${f.stmt.slice(0, 160)}`);
console.log(`Incremental migration failures: ${incFailures.length}`);
for (const f of incFailures) console.log(`  [UNEXPECTED] ${f.source}#${f.idx}: ${f.error}\n    ${f.stmt.slice(0, 160)}`);

console.log("\n=== Object counts (PGlite replay vs live) ===");
const counts = {
  tables: [`SELECT count(*)::int AS c FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`, 21],
  columns: [`SELECT count(*)::int AS c FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped`, 303],
  constraints: [`SELECT count(*)::int AS c FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND con.contype IN ('p','u','f','c')`, 77],
  indexes: [`SELECT count(*)::int AS c FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND i.indisvalid AND NOT EXISTS (SELECT 1 FROM pg_constraint co WHERE co.conindid=i.indexrelid)`, 44],
  functions: [`SELECT count(*)::int AS c FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind IN ('f','p') AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid=p.oid AND d.deptype='e')`, 24],
  triggers: [`SELECT count(*)::int AS c FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal`, 9],
  policies: [`SELECT count(*)::int AS c FROM pg_policies WHERE schemaname IN ('public','storage')`, 79],
  rls_enabled: [`SELECT count(*)::int AS c FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relrowsecurity`, 21],
  enums: [`SELECT count(*)::int AS c FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e'`, 1],
  buckets: [`SELECT count(*)::int AS c FROM storage.buckets`, 2],
};

let mismatches = 0;
for (const [k, [q, expected]] of Object.entries(counts)) {
  const got = await scalar(q);
  const ok = got === expected;
  if (!ok) mismatches++;
  console.log(`${ok ? "OK  " : "FAIL"} ${k}: replay=${got} live=${expected}`);
}

const pass = unexpected.length === 0 && incFailures.length === 0 && mismatches === 0;
console.log(`\n${pass ? "VERIFICATION PASSED" : "VERIFICATION FAILED"}`);
process.exit(pass ? 0 : 1);
