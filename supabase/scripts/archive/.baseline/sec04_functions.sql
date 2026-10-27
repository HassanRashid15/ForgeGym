-- Section 04: functions (as one aggregated cell; excludes extension-owned)
SELECT string_agg(pg_get_functiondef(p.oid) || ';', E'\n\n' ORDER BY p.proname, p.oid) AS ddl
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind IN ('f', 'p')
  AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e');
