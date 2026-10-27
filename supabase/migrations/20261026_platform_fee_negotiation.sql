-- Gym owner / platform member fee acceptance + concession negotiation with super admin.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS platform_fee_status text,
  ADD COLUMN IF NOT EXISTS platform_fee_concession_amount text,
  ADD COLUMN IF NOT EXISTS platform_fee_concession_note text,
  ADD COLUMN IF NOT EXISTS platform_fee_responded_at timestamptz;

COMMENT ON COLUMN public.profiles.platform_fee_status IS
  'pending_acceptance | accepted | concession_requested | concession_rejected';
COMMENT ON COLUMN public.profiles.platform_fee_concession_amount IS
  'Amount requested by gym owner / platform member as a concession';
COMMENT ON COLUMN public.profiles.platform_fee_concession_note IS
  'Optional note with the concession request';
COMMENT ON COLUMN public.profiles.platform_fee_responded_at IS
  'When the owner last accepted or requested a concession';
