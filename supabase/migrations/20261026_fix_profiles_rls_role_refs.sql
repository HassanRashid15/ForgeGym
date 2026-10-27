-- Fix: after dropping profiles.role / profiles.is_approved, leftover RLS
-- expressions still referenced those columns and broke every profiles SELECT
-- under the anon/authenticated JWT (error 42703: column "role" does not exist).
-- That made dashboard treat the user as unverified → /verification → logout loop.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND (
        COALESCE(qual, '') ~* '(^|[^a-z_])role([^a-z_]|$)'
        OR COALESCE(with_check, '') ~* '(^|[^a-z_])role([^a-z_]|$)'
        OR COALESCE(qual, '') ILIKE '%is_approved%'
        OR COALESCE(with_check, '') ILIKE '%is_approved%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    RAISE NOTICE 'Dropped broken profiles policy: %', r.policyname;
  END LOOP;
END $$;

-- Recreate the only policy that historically used profiles.role / is_approved
DROP POLICY IF EXISTS "Super admins can approve admins" ON public.profiles;
CREATE POLICY "Super admins can approve admins" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Ensure own-row SELECT still works (idempotent)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  AS PERMISSIVE FOR SELECT TO public
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO public
  USING (auth.uid() = user_id);

-- Verify no remaining broken refs
DO $$
DECLARE
  leftover text;
BEGIN
  SELECT string_agg(policyname, ', ')
  INTO leftover
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND (
      COALESCE(qual, '') ~* '(^|[^a-z_])role([^a-z_]|$)'
      OR COALESCE(with_check, '') ~* '(^|[^a-z_])role([^a-z_]|$)'
      OR COALESCE(qual, '') ILIKE '%is_approved%'
      OR COALESCE(with_check, '') ILIKE '%is_approved%'
    );

  IF leftover IS NOT NULL THEN
    RAISE EXCEPTION 'Still have broken profiles policies referencing role/is_approved: %', leftover;
  END IF;
END $$;
