-- Track rejected admin requests so super admin can approve again later
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_rejected_at timestamptz;
