-- Section 05: constraints via ALTER TABLE (as one aggregated cell)
SELECT string_agg(
  'ALTER TABLE public.' || quote_ident(c.relname) || ' ADD CONSTRAINT ' || quote_ident(ct.conname) || ' ' ||
  pg_get_constraintdef(ct.oid) ||
  CASE WHEN ct.condeferrable THEN ' DEFERRABLE' || CASE WHEN ct.condeferred THEN ' INITIALLY DEFERRED' ELSE '' END ELSE '' END || ';',
  E'\n' ORDER BY CASE WHEN ct.contype = 'f' THEN 1 ELSE 0 END, c.relname, ct.conname
) AS ddl
FROM pg_constraint ct
JOIN pg_class c ON c.oid = ct.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND ct.contype IN ('p', 'u', 'f', 'c');
