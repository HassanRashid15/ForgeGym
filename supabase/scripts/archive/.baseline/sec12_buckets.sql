-- Section 12: storage bucket seed, idempotent (as one aggregated cell)
SELECT string_agg(
  'INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at) VALUES (' ||
  quote_literal(b.id) || ', ' || quote_literal(b.name) || ', ' || b.public::text || ', ' ||
  quote_nullable(b.file_size_limit::text) || ', ' ||
  CASE WHEN b.allowed_mime_types IS NULL THEN 'NULL' ELSE
    quote_literal('{' || array_to_string(b.allowed_mime_types, ',') || '}')
  END || ', now(), now()) ON CONFLICT (id) DO NOTHING;',
  E'\n' ORDER BY b.id
) AS ddl
FROM storage.buckets b;
