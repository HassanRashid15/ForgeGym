-- Section 11: publication membership, guarded for replay on fresh projects (as one aggregated cell)
SELECT string_agg(
  E'DO $\$\nBEGIN\n  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = ' || quote_literal(pr.pubname) || E')' ||
  E'\n     AND to_regclass(' || quote_literal(pr.schemaname || '.' || pr.tablename) || E') IS NOT NULL' ||
  E'\n     AND NOT EXISTS (' ||
    E'\n       SELECT 1 FROM pg_publication_rel px' ||
    E'\n       JOIN pg_class pc ON pc.oid = px.prrelid' ||
    E'\n       JOIN pg_namespace pn ON pn.oid = pc.relnamespace' ||
    E'\n       JOIN pg_publication pp ON pp.oid = px.prpubid' ||
    E'\n       WHERE pp.pubname = ' || quote_literal(pr.pubname) ||
    E'\n         AND pn.nspname = ' || quote_literal(pr.schemaname) ||
    E'\n         AND pc.relname = ' || quote_literal(pr.tablename) ||
  E'\n     ) THEN' ||
  E'\n    EXECUTE ' || quote_literal('ALTER PUBLICATION ' || quote_ident(pr.pubname) || ' ADD TABLE ' || quote_ident(pr.schemaname) || '.' || quote_ident(pr.tablename)) || E';' ||
  E'\n  END IF;\nEND\n$\$;',
  E'\n\n' ORDER BY pr.pubname, pr.tablename
) AS ddl
FROM (
  SELECT DISTINCT p.pubname, pn2.nspname AS schemaname, pc.relname AS tablename
  FROM pg_publication_rel pxrel
  JOIN pg_publication p ON p.oid = pxrel.prpubid
  JOIN pg_class pc ON pc.oid = pxrel.prrelid
  JOIN pg_namespace pn2 ON pn2.oid = pc.relnamespace
  WHERE pn2.nspname = 'public'
) pr;
