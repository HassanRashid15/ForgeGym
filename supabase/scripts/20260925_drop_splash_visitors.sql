-- Remove home splash IP tracking (no longer used)
-- Safe to re-run in Supabase SQL Editor

DROP INDEX IF EXISTS public.idx_splash_visitors_first_seen;
DROP INDEX IF EXISTS public.splash_visitors_ip_unique;
DROP TABLE IF EXISTS public.splash_visitors;
