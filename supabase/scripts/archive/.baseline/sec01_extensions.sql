-- Section 01: extensions (as one aggregated cell)
SELECT string_agg(
  'CREATE EXTENSION IF NOT EXISTS ' || quote_ident(e.extname) || ' WITH SCHEMA ' || quote_ident(n.nspname) || ';',
  E'\n' ORDER BY e.extname
) AS ddl
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname <> 'plpgsql';
