-- Production security: close open profile SELECT, gym-scoped RLS, privileged column guard,
-- public gyms catalog table (no PII), drop dead gym_owner_user_id confusion.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE user_id = _user_id LIMIT 1),
    false
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND lower(email) = 'superadmin@forge.test'
  );
$$;

CREATE OR REPLACE FUNCTION public.my_gym_owner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin') THEN auth.uid()
    ELSE (
      SELECT gym_owner_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
    )
  END;
$$;

-- Block privilege escalation on self-service updates
CREATE OR REPLACE FUNCTION public.profiles_block_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Service role / trigger contexts often have null auth.uid()
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Non-owners cannot change another row here (RLS also enforces)
  IF NEW.user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed to update this profile';
  END IF;

  -- Self-service: freeze privileged columns
  IF NEW.user_id = auth.uid() AND NOT public.is_super_admin(auth.uid()) THEN
    NEW.is_super_admin := OLD.is_super_admin;
    NEW.admin_approved := OLD.admin_approved;
    NEW.admin_rejected_at := OLD.admin_rejected_at;
    NEW.approval_requested_at := OLD.approval_requested_at;
    NEW.is_verified := OLD.is_verified;
    NEW.login_enabled := OLD.login_enabled;
    NEW.gym_owner_id := OLD.gym_owner_id;
    NEW.membership_status := OLD.membership_status;
    NEW.membership_type := OLD.membership_type;
    NEW.system_permissions := OLD.system_permissions;
    NEW.account_status := OLD.account_status;
    NEW.email := OLD.email;
    NEW.user_id := OLD.user_id;
    NEW.id := OLD.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_block_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_block_privilege_escalation();

-- ---------------------------------------------------------------------------
-- Drop dangerous / overly broad policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow public check verification" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Keep own-profile policies; recreate if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON public.profiles
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.profiles
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Super admin: full access
CREATE POLICY "Super admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Gym-scoped admins: own gym members + own row
CREATE POLICY "Gym admins can view gym profiles" ON public.profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    AND (
      user_id = auth.uid()
      OR gym_owner_id = auth.uid()
    )
  );

CREATE POLICY "Gym admins can update gym profiles" ON public.profiles
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
    AND (
      user_id = auth.uid()
      OR gym_owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND (
      user_id = auth.uid()
      OR gym_owner_id = auth.uid()
    )
  );

-- Members can see their gym owner's public branding fields only via gyms table;
-- they may still need to read peers? Keep minimal: own + gym owner profile (limited by app selects)
CREATE POLICY "Members can view own gym owner profile" ON public.profiles
  FOR SELECT USING (
    user_id = public.my_gym_owner_id()
    AND user_id IS DISTINCT FROM auth.uid()
  );

-- Roles: own, super admin, or gym-scoped for members of your gym
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins manage roles" ON public.user_roles
  FOR ALL USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Gym admins manage gym member roles" ON public.user_roles
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = user_roles.user_id
          AND p.gym_owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = user_roles.user_id
          AND p.gym_owner_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Public gyms catalog (no PII) — long-term org surface, synced from profiles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.gyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  gym_type text,
  city text,
  facilities text[] DEFAULT '{}',
  services text[] DEFAULT '{}',
  peak_hours text,
  member_capacity text,
  years_operating text,
  operating_days integer,
  bio text,
  avatar_url text,
  owner_display_name text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gyms_published_name_idx
  ON public.gyms (name)
  WHERE is_published = true;

ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published gyms" ON public.gyms;
CREATE POLICY "Public can read published gyms" ON public.gyms
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Owners manage own gym row" ON public.gyms;
CREATE POLICY "Owners manage own gym row" ON public.gyms
  FOR ALL USING (owner_user_id = auth.uid() OR public.is_super_admin(auth.uid()))
  WITH CHECK (owner_user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.sync_gym_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin'
  ) INTO is_admin;

  IF is_admin
     AND COALESCE(NEW.is_super_admin, false) = false
     AND COALESCE(NEW.admin_approved, false) = true
     AND NULLIF(trim(COALESCE(NEW.gym_name, '')), '') IS NOT NULL
  THEN
    INSERT INTO public.gyms AS g (
      owner_user_id, name, gym_type, city, facilities, services,
      peak_hours, member_capacity, years_operating, operating_days,
      bio, avatar_url, owner_display_name, is_published, updated_at
    ) VALUES (
      NEW.user_id, trim(NEW.gym_name), NEW.gym_type, NEW.gym_city,
      COALESCE(NEW.gym_facilities, '{}'), COALESCE(NEW.gym_services, '{}'),
      NEW.gym_peak_hours, NEW.gym_member_capacity, NEW.gym_years_operating,
      NEW.gym_operating_days, NEW.bio, NEW.avatar_url, NEW.full_name,
      true, now()
    )
    ON CONFLICT (owner_user_id) DO UPDATE SET
      name = EXCLUDED.name,
      gym_type = EXCLUDED.gym_type,
      city = EXCLUDED.city,
      facilities = EXCLUDED.facilities,
      services = EXCLUDED.services,
      peak_hours = EXCLUDED.peak_hours,
      member_capacity = EXCLUDED.member_capacity,
      years_operating = EXCLUDED.years_operating,
      operating_days = EXCLUDED.operating_days,
      bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url,
      owner_display_name = EXCLUDED.owner_display_name,
      is_published = true,
      updated_at = now();
  ELSE
    UPDATE public.gyms
    SET is_published = false, updated_at = now()
    WHERE owner_user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_gym ON public.profiles;
CREATE TRIGGER profiles_sync_gym
  AFTER INSERT OR UPDATE OF gym_name, gym_type, gym_city, gym_facilities, gym_services,
    gym_peak_hours, gym_member_capacity, gym_years_operating, gym_operating_days,
    bio, avatar_url, full_name, admin_approved, is_super_admin
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gym_from_profile();

-- Backfill published gyms from current approved owners
INSERT INTO public.gyms (
  owner_user_id, name, gym_type, city, facilities, services,
  peak_hours, member_capacity, years_operating, operating_days,
  bio, avatar_url, owner_display_name, is_published
)
SELECT
  p.user_id, trim(p.gym_name), p.gym_type, p.gym_city,
  COALESCE(p.gym_facilities, '{}'), COALESCE(p.gym_services, '{}'),
  p.gym_peak_hours, p.gym_member_capacity, p.gym_years_operating,
  p.gym_operating_days, p.bio, p.avatar_url, p.full_name, true
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'admin'
WHERE COALESCE(p.is_super_admin, false) = false
  AND COALESCE(p.admin_approved, false) = true
  AND NULLIF(trim(COALESCE(p.gym_name, '')), '') IS NOT NULL
ON CONFLICT (owner_user_id) DO UPDATE SET
  name = EXCLUDED.name,
  gym_type = EXCLUDED.gym_type,
  city = EXCLUDED.city,
  facilities = EXCLUDED.facilities,
  services = EXCLUDED.services,
  peak_hours = EXCLUDED.peak_hours,
  member_capacity = EXCLUDED.member_capacity,
  years_operating = EXCLUDED.years_operating,
  operating_days = EXCLUDED.operating_days,
  bio = EXCLUDED.bio,
  avatar_url = EXCLUDED.avatar_url,
  owner_display_name = EXCLUDED.owner_display_name,
  is_published = true,
  updated_at = now();
