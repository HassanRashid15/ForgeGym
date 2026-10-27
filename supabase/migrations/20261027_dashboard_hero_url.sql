-- Personal dashboard/profile hero background for every role (overrides gym main image).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dashboard_hero_url text;

COMMENT ON COLUMN public.profiles.dashboard_hero_url IS
  'Optional personal dashboard/profile hero image URL. When set, used instead of gym main image.';
