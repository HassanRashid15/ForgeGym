-- Fix remote profiles schema (missing columns) + seed superadmin@forge.test
-- Run the ENTIRE script once in Supabase SQL Editor.

-- ═══════════════════════════════════════════════════════════════
-- 1) Add every column the app expects (safe if already present)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_type text DEFAULT 'basic';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_status text DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS join_date timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weight_kg numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height_cm numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activity_level text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fitness_goal text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_level text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_areas text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workout_days_per_week integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workout_duration text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workout_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_workout_time text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_approved boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_years_operating text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_facilities text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_operating_days integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_peak_hours text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_member_capacity text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_services text[];

-- Ensure app_role enum + user_roles exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ═══════════════════════════════════════════════════════════════
-- 2) Seed / promote superadmin@forge.test
--    Create this user first in Authentication → Users if missing:
--    email: superadmin@forge.test
--    password: SuperAdmin123
--    Auto Confirm: ON
-- ═══════════════════════════════════════════════════════════════
WITH u AS (
  SELECT id, email FROM auth.users WHERE lower(email) = 'superadmin@forge.test'
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM u
ON CONFLICT DO NOTHING;

WITH u AS (
  SELECT id, email FROM auth.users WHERE lower(email) = 'superadmin@forge.test'
)
INSERT INTO public.profiles (id, user_id, email, full_name, admin_approved, membership_status, membership_type)
SELECT id, id, email, 'Super Admin', true, 'active', 'basic'
FROM u
ON CONFLICT (user_id) DO UPDATE
SET
  email = EXCLUDED.email,
  admin_approved = true,
  full_name = COALESCE(public.profiles.full_name, 'Super Admin'),
  updated_at = now();

-- 3) Approve all current admin accounts
UPDATE public.profiles p
SET admin_approved = true, updated_at = now()
FROM public.user_roles ur
WHERE ur.user_id = p.user_id
  AND ur.role = 'admin';

-- 4) Verify result
SELECT u.email, ur.role, p.admin_approved, p.full_name
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE ur.role = 'admin';
