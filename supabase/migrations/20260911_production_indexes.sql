-- Production hardening: indexes for common auth/admin/gym query patterns

CREATE INDEX IF NOT EXISTS profiles_email_idx
  ON public.profiles (lower(email));

CREATE INDEX IF NOT EXISTS profiles_admin_approved_idx
  ON public.profiles (admin_approved)
  WHERE admin_approved IS NOT TRUE;

CREATE INDEX IF NOT EXISTS profiles_is_super_admin_idx
  ON public.profiles (is_super_admin)
  WHERE is_super_admin = true;

CREATE INDEX IF NOT EXISTS profiles_gym_owner_approval_idx
  ON public.profiles (gym_owner_id, admin_approved);

CREATE INDEX IF NOT EXISTS profiles_approval_requested_at_idx
  ON public.profiles (approval_requested_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS user_roles_role_idx
  ON public.user_roles (role);
