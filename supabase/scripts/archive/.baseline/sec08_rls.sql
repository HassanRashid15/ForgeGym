-- Section 08: RLS enablement (as one aggregated cell)
SELECT string_agg(
  'ALTER TABLE public.' || quote_ident(c.relname) || ' ENABLE ROW LEVEL SECURITY;' ||
  CASE WHEN c.relforcerowsecurity THEN E'\nALTER TABLE public.' || quote_ident(c.relname) || ' FORCE ROW LEVEL SECURITY;' ELSE '' END,
  E'\n' ORDER BY c.relname
) AS ddl
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity;
