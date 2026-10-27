-- Section 09: RLS policies for public tables and storage tables
-- storage tables pre-exist in every Supabase project, so policies only (as one aggregated cell)
SELECT string_agg(
  'CREATE POLICY ' || quote_ident(p.policyname) || ' ON ' || quote_ident(p.schemaname) || '.' || quote_ident(p.tablename) ||
  ' AS ' || p.permissive || ' FOR ' || p.cmd || ' TO ' || array_to_string(p.roles, ', ') ||
  COALESCE(' USING (' || p.qual || ')', '') ||
  COALESCE(' WITH CHECK (' || p.with_check || ')', '') || ';',
  E'\n' ORDER BY p.schemaname, p.tablename, p.policyname
) AS ddl
FROM pg_policies p
WHERE p.schemaname IN ('public', 'storage');
