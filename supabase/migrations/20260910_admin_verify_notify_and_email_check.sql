-- Admin approval requests + stronger email uniqueness checks

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_requested_at timestamptz;

-- In-app notifications for approved super admins
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'admin_approval_request',
  from_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_notifications'
      AND policyname = 'Admins can view own notifications'
  ) THEN
    CREATE POLICY "Admins can view own notifications"
      ON public.admin_notifications
      FOR SELECT
      USING (auth.uid() = recipient_user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admin_notifications'
      AND policyname = 'Admins can update own notifications'
  ) THEN
    CREATE POLICY "Admins can update own notifications"
      ON public.admin_notifications
      FOR UPDATE
      USING (auth.uid() = recipient_user_id);
  END IF;
END $$;

-- Stronger account-exists check (auth.users + profiles.email)
CREATE OR REPLACE FUNCTION public.check_user_exists(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF check_email IS NULL OR trim(check_email) = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(check_email))
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE email IS NOT NULL
      AND lower(email) = lower(trim(check_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO anon, authenticated, service_role;

-- Reliable role lookup (bypasses RLS edge cases for the caller's own roles)
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS TABLE(role public.app_role)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;

-- When an admin verifies email → request approval + notify all approved admins
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
  v_name text;
  v_email text;
  r record;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  THEN
    UPDATE public.profiles
    SET is_verified = true,
        updated_at = now()
    WHERE user_id = NEW.id;

    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.id AND role = 'admin'
    ) INTO v_is_admin;

    IF v_is_admin THEN
      UPDATE public.profiles
      SET approval_requested_at = COALESCE(approval_requested_at, now()),
          updated_at = now()
      WHERE user_id = NEW.id
        AND COALESCE(admin_approved, false) = false;

      SELECT COALESCE(full_name, split_part(NEW.email, '@', 1)), NEW.email
      INTO v_name, v_email
      FROM public.profiles
      WHERE user_id = NEW.id;

      FOR r IN
        SELECT p.user_id
        FROM public.profiles p
        JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'admin'
        WHERE p.admin_approved = true
          AND p.user_id <> NEW.id
      LOOP
        INSERT INTO public.admin_notifications (
          recipient_user_id,
          type,
          from_user_id,
          title,
          message
        ) VALUES (
          r.user_id,
          'admin_approval_request',
          NEW.id,
          'New admin awaiting approval',
          COALESCE(v_name, 'An admin') || ' (' || COALESCE(v_email, NEW.email) || ') verified their email and is waiting for approval.'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();
