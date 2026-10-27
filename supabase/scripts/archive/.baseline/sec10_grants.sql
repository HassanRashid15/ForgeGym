-- Section 10: grants on public tables and functions (as one aggregated cell)
WITH table_grants AS (
  SELECT
    'GRANT ' || string_agg(DISTINCT a.privilege_type, ', ' ORDER BY a.privilege_type) ||
    ' ON TABLE public.' || quote_ident(c.relname) || ' TO ' ||
    CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(r.rolname) END ||
    CASE WHEN bool_or(a.is_grantable) THEN ' WITH GRANT OPTION' ELSE '' END || ';' AS ddl,
    c.relname AS obj, 1 AS ord
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN aclexplode(c.relacl) a ON true
  LEFT JOIN pg_roles r ON r.oid = a.grantee
  WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND a.grantee <> c.relowner
    AND a.grantor <> a.grantee
  GROUP BY c.relname, a.grantee, r.rolname
),
function_grants AS (
  SELECT
    'GRANT ' || string_agg(DISTINCT a.privilege_type, ', ' ORDER BY a.privilege_type) ||
    ' ON FUNCTION ' || quote_ident(n.nspname) || '.' || quote_ident(p.proname) ||
    '(' || pg_get_function_identity_arguments(p.oid) || ') TO ' ||
    CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE quote_ident(r.rolname) END ||
    CASE WHEN bool_or(a.is_grantable) THEN ' WITH GRANT OPTION' ELSE '' END || ';' AS ddl,
    p.proname AS obj, 2 AS ord
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN aclexplode(p.proacl) a ON true
  LEFT JOIN pg_roles r ON r.oid = a.grantee
  WHERE n.nspname = 'public'
    AND a.grantee <> p.proowner
    AND a.grantor <> a.grantee
  GROUP BY n.nspname, p.proname, p.oid, a.grantee, r.rolname
)
SELECT string_agg(g.ddl, E'\n' ORDER BY g.ord, g.obj) AS ddl
FROM (SELECT * FROM table_grants UNION ALL SELECT * FROM function_grants) g;
