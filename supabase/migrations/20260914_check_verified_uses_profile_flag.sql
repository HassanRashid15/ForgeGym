-- App-level email verification: login requires profiles.is_verified
-- (not only auth.users.email_confirmed_at, which can be auto-set).

CREATE OR REPLACE FUNCTION public.check_user_verified(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified BOOLEAN := false;
BEGIN
  IF user_email IS NULL OR trim(user_email) = '' THEN
    RETURN false;
  END IF;

  SELECT COALESCE(is_verified, false) INTO v_verified
  FROM public.profiles
  WHERE lower(email) = lower(trim(user_email));

  RETURN COALESCE(v_verified, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_verified(TEXT) TO anon, authenticated, service_role;
