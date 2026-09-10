-- Staff role + gym scoping + staff-member fields

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'staff'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'staff';
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gym_owner_id uuid,
  ADD COLUMN IF NOT EXISTS gym_name text,
  ADD COLUMN IF NOT EXISTS staff_type text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS supervisor text,
  ADD COLUMN IF NOT EXISTS shift text,
  ADD COLUMN IF NOT EXISTS overtime_rate text,
  ADD COLUMN IF NOT EXISTS responsibilities text,
  ADD COLUMN IF NOT EXISTS login_enabled boolean DEFAULT true;

-- Backfill gym owners: self as gym_owner_id when they are approved admins
UPDATE public.profiles p
SET gym_owner_id = p.user_id
WHERE p.gym_owner_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.user_id AND ur.role = 'admin'
  )
  AND COALESCE(p.is_super_admin, false) = false;

CREATE INDEX IF NOT EXISTS profiles_gym_owner_id_idx ON public.profiles (gym_owner_id);
