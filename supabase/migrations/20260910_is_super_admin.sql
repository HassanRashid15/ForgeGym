-- Distinguish super admin (platform) from gym-owner admin
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Seeded platform account
UPDATE public.profiles p
SET is_super_admin = true,
    admin_approved = true,
    updated_at = now()
FROM auth.users u
WHERE p.user_id = u.id
  AND lower(u.email) = 'superadmin@forge.test';

-- Everyone else is not super admin
UPDATE public.profiles
SET is_super_admin = false
WHERE is_super_admin IS DISTINCT FROM true
  AND user_id NOT IN (
    SELECT id FROM auth.users WHERE lower(email) = 'superadmin@forge.test'
  );
