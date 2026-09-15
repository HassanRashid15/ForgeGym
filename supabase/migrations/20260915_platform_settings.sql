-- Platform settings (super-admin facility fee, etc.)
-- No hardcoded fee — super admin sets platform_facility_fee via Statistics.
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Service role / server routes handle writes; authenticated read via API.
DROP POLICY IF EXISTS "platform_settings_select_authenticated" ON public.platform_settings;
CREATE POLICY "platform_settings_select_authenticated"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (true);
