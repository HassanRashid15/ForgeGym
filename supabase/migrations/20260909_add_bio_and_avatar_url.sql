-- Add missing profile columns used by the app UI / API

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Refresh PostgREST schema cache so new columns are visible immediately
NOTIFY pgrst, 'reload schema';
