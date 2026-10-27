-- Section 02: enum types (as one aggregated cell)
SELECT string_agg(
  'CREATE TYPE ' || quote_ident(n.nspname) || '.' || quote_ident(t.typname) || ' AS ENUM (' ||
  (SELECT string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder)
     FROM pg_enum e WHERE e.enumtypid = t.oid) || ');',
  E'\n' ORDER BY t.typname
) AS ddl
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typtype = 'e'
  AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_type'::regclass AND d.objid = t.oid AND d.deptype = 'e');
