-- DIAGNOSTIC + FIX for superadmin login
-- Run in Supabase SQL Editor.

-- A) Do you already have this auth user?
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE lower(email) = 'superadmin@forge.test';
-- If this returns 0 rows → create the user in Authentication → Users first
-- (SQL cannot set a password for a new auth user).

-- B) Ensure profiles columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_approved boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- C) Promote + sync profile (only works AFTER auth user exists)
WITH u AS (
  SELECT id, email FROM auth.users WHERE lower(email) = 'superadmin@forge.test'
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM u
ON CONFLICT DO NOTHING;

WITH u AS (
  SELECT id, email FROM auth.users WHERE lower(email) = 'superadmin@forge.test'
)
INSERT INTO public.profiles (id, user_id, email, full_name, admin_approved)
SELECT id, id, email, 'Super Admin', true
FROM u
ON CONFLICT (user_id) DO UPDATE
SET
  email = EXCLUDED.email,
  admin_approved = true,
  full_name = COALESCE(public.profiles.full_name, 'Super Admin'),
  updated_at = now();

-- D) Final check — must show 1 row
SELECT
  u.email AS auth_email,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  ur.role,
  p.admin_approved,
  p.full_name
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE lower(u.email) = 'superadmin@forge.test';
