-- Public site traffic / approaches (super-admin dashboard)
-- Safe to re-run

CREATE TABLE IF NOT EXISTS public.public_traffic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  path text NOT NULL DEFAULT '/',
  referrer text,
  user_agent text,
  visited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_traffic_visited
  ON public.public_traffic (visited_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_traffic_ip
  ON public.public_traffic (ip_address);

COMMENT ON TABLE public.public_traffic IS
  'Anonymous public-site page approaches for super-admin Public Traffic dashboard';

ALTER TABLE public.public_traffic ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can read public traffic" ON public.public_traffic;

CREATE POLICY "Super admins can read public traffic"
  ON public.public_traffic FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.is_super_admin = true
    )
  );

GRANT SELECT ON public.public_traffic TO authenticated;
GRANT ALL ON public.public_traffic TO service_role;

-- Enable realtime (ignore error if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.public_traffic;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
