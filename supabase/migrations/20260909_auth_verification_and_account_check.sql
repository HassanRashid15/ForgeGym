-- Migration: Real-time Email Verification & Account Existence Check
-- Created: 2026-09-09

-- 1. Add is_verified column to profiles table if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Backfill existing profiles where auth user is already confirmed
UPDATE public.profiles p
SET is_verified = true
FROM auth.users u
WHERE p.user_id = u.id AND u.email_confirmed_at IS NOT NULL;

-- 3. RPC: Check if an account exists by email (for real-time inline login check)
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
    SELECT 1 FROM public.profiles WHERE lower(email) = lower(trim(check_email))
  ) OR EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(check_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO anon, authenticated, service_role;

-- 4. RPC: Check if user's email is verified (for real-time verification page)
CREATE OR REPLACE FUNCTION public.check_user_verified(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_confirmed BOOLEAN := false;
BEGIN
  IF user_email IS NULL OR trim(user_email) = '' THEN
    RETURN false;
  END IF;

  -- Check auth.users table for confirmed email
  SELECT (email_confirmed_at IS NOT NULL) INTO v_confirmed
  FROM auth.users
  WHERE lower(email) = lower(trim(user_email));

  IF v_confirmed IS TRUE THEN
    RETURN true;
  END IF;

  -- Fallback check on profiles table
  SELECT COALESCE(is_verified, false) INTO v_confirmed
  FROM public.profiles
  WHERE lower(email) = lower(trim(user_email));

  RETURN COALESCE(v_confirmed, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_verified(TEXT) TO anon, authenticated, service_role;

-- 5. Trigger: automatically sync is_verified when auth.users.email_confirmed_at is updated
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
    UPDATE public.profiles
    SET is_verified = true,
        updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();

-- 6. Enable Realtime on profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- Publication might not exist in local dev without supabase realtime extension
END $$;

-- 7. Policy: Allow reading is_verified and email for verification & account checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Allow public check verification'
  ) THEN
    CREATE POLICY "Allow public check verification" ON public.profiles
      FOR SELECT USING (true);
  END IF;
END $$;
