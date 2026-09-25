-- Home splash: show once per visitor IP
-- Safe to re-run

CREATE TABLE IF NOT EXISTS public.splash_visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  user_agent text,
  first_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS splash_visitors_ip_unique
  ON public.splash_visitors (ip_address);

CREATE INDEX IF NOT EXISTS idx_splash_visitors_first_seen
  ON public.splash_visitors (first_seen_at DESC);

COMMENT ON TABLE public.splash_visitors IS
  'IPs that have already seen the home page preloader (once per visitor)';

ALTER TABLE public.splash_visitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service manages splash visitors" ON public.splash_visitors;

-- No public access — API / RSC use service role only
GRANT ALL ON public.splash_visitors TO service_role;
