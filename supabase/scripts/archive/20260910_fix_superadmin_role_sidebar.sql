-- Ensure seeded superadmin has admin role + approved (fixes missing Users sidebar)
-- Run after seed if Admin panel / Users link is missing

UPDATE auth.users
SET raw_user_meta_data =
  COALESCE(raw_user_meta_data, '{}'::jsonb)
  || '{"full_name":"Super Admin","requested_role":"admin"}'::jsonb
WHERE lower(email) = 'superadmin@forge.test';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'superadmin@forge.test'
ON CONFLICT DO NOTHING;

UPDATE public.profiles p
SET
  admin_approved = true,
  is_verified = true,
  email = COALESCE(p.email, u.email),
  full_name = COALESCE(p.full_name, 'Super Admin'),
  updated_at = now()
FROM auth.users u
WHERE u.id = p.user_id
  AND lower(u.email) = 'superadmin@forge.test';

SELECT u.email, ur.role, p.admin_approved, p.is_verified
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.profiles p ON p.user_id = u.id
WHERE lower(u.email) = 'superadmin@forge.test';
