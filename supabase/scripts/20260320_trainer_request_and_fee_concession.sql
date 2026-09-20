-- Trainer change requests (customer → admin approval) + per-member fee concessions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_trainer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trainer_request_pending boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fee_concession text;

COMMENT ON COLUMN public.profiles.pending_trainer_id IS
  'Requested trainer while trainer_request_pending; null means request to remove trainer';
COMMENT ON COLUMN public.profiles.trainer_request_pending IS
  'True when member requested a trainer add/change/remove awaiting gym admin approval';
COMMENT ON COLUMN public.profiles.fee_concession IS
  'Optional admin override for this member''s total monthly fee (replaces gym+trainer formula when set)';

CREATE INDEX IF NOT EXISTS idx_profiles_trainer_request_pending
  ON public.profiles (gym_owner_id)
  WHERE trainer_request_pending = true;
