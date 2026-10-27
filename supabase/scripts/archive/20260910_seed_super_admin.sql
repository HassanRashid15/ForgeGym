-- Bootstrap: seed / unlock super admin so admin login works
-- Run this once in Supabase SQL Editor after admin registration migrations.

-- 1. Ensure approval column exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN NOT NULL DEFAULT true;

-- 2. Promote the OLDEST auth user to approved super admin
--    (change the email filter below if you want a specific account instead)
WITH target AS (
  SELECT id AS user_id, email
  FROM auth.users
  ORDER BY created_at ASC
  LIMIT 1
),
ensure_role AS (
  INSERT INTO public.user_roles (user_id, role)
  SELECT user_id, 'admin'::public.app_role FROM target
  ON CONFLICT DO NOTHING
  RETURNING user_id
)
UPDATE public.profiles p
SET
  admin_approved = true,
  updated_at = now()
FROM target t
WHERE p.user_id = t.user_id;

-- 3. Also approve EVERY account that already has role = admin
--    (unlocks any pending gym-owner signups during bootstrap)
UPDATE public.profiles p
SET
  admin_approved = true,
  updated_at = now()
FROM public.user_roles ur
WHERE ur.user_id = p.user_id
  AND ur.role = 'admin'
  AND p.admin_approved IS DISTINCT FROM true;

-- 4. Show who is now an approved admin
SELECT
  u.email,
  ur.role,
  p.admin_approved,
  p.full_name
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE ur.role = 'admin';
