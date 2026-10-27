-- Force superadmin@forge.test to be approved admin (fixes Customersidebar / missing Users link)

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'superadmin@forge.test'
ON CONFLICT DO NOTHING;

-- Remove mistaken 'user' role if both somehow exist (optional cleanup)
DELETE FROM public.user_roles ur
USING auth.users u
WHERE ur.user_id = u.id
  AND lower(u.email) = 'superadmin@forge.test'
  AND ur.role = 'user';

UPDATE public.profiles p
SET
  admin_approved = true,
  is_verified = true,
  email = COALESCE(p.email, u.email),
  updated_at = now()
FROM auth.users u
WHERE p.user_id = u.id
  AND lower(u.email) = 'superadmin@forge.test';

UPDATE auth.users
SET raw_user_meta_data =
  COALESCE(raw_user_meta_data, '{}'::jsonb)
  || '{"requested_role":"admin","full_name":"Super Admin"}'::jsonb
WHERE lower(email) = 'superadmin@forge.test';

SELECT u.email, ur.role, p.admin_approved
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE lower(u.email) = 'superadmin@forge.test';
