-- Section 07: triggers (as one aggregated cell)
SELECT string_agg(pg_get_triggerdef(t.oid) || ';', E'\n' ORDER BY c.relname, t.tgname) AS ddl
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal
  AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_trigger'::regclass AND d.objid = t.oid AND d.deptype = 'e');
