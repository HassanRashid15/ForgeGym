-- Section 06: indexes not backing constraints (as one aggregated cell)
SELECT string_agg(pg_get_indexdef(i.indexrelid) || ';', E'\n' ORDER BY ic.relname) AS ddl
FROM pg_index i
JOIN pg_class c ON c.oid = i.indrelid
JOIN pg_class ic ON ic.oid = i.indexrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND i.indisvalid
  AND NOT EXISTS (SELECT 1 FROM pg_constraint ct WHERE ct.conindid = i.indexrelid);
