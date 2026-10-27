-- Set isSuperAdmin flag for super admin user

UPDATE public.profiles
SET is_super_admin = true
WHERE user_id IN (
  SELECT id 
  FROM auth.users 
  WHERE lower(email) = 'superadmin@forge.test'
);

-- Verify the update
SELECT 
  u.email,
  p.is_super_admin,
  ur.role,
  p.admin_approved
FROM auth.users u
JOIN public.profiles p ON p.user_id = u.id
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE lower(u.email) = 'superadmin@forge.test';
