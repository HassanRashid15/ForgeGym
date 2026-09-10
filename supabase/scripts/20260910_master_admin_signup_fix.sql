-- MASTER FIX: admin signup storage + immediate super-admin notification
-- Run this ENTIRE script once in Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════════
-- 1) Columns
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weight_kg numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS height_cm numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activity_level text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fitness_goal text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_level text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_areas text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workout_days_per_week integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workout_duration text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workout_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_workout_time text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_approved boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_requested_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_years_operating text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_facilities text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_operating_days integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_peak_hours text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_member_capacity text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_services text[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_type text DEFAULT 'basic';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_status text DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, role)
);

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
    WHERE tablename = 'admin_notifications' AND policyname = 'Admins can view own notifications'
  ) THEN
    CREATE POLICY "Admins can view own notifications"
      ON public.admin_notifications FOR SELECT
      USING (auth.uid() = recipient_user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'admin_notifications' AND policyname = 'Admins can update own notifications'
  ) THEN
    CREATE POLICY "Admins can update own notifications"
      ON public.admin_notifications FOR UPDATE
      USING (auth.uid() = recipient_user_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2) Helper: notify all approved super admins
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_approved_admins(
  p_from_user_id uuid,
  p_title text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.user_id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'admin'
    WHERE COALESCE(p.admin_approved, false) = true
      AND (p_from_user_id IS NULL OR p.user_id <> p_from_user_id)
  LOOP
    INSERT INTO public.admin_notifications (
      recipient_user_id, type, from_user_id, title, message
    ) VALUES (
      r.user_id, 'admin_approval_request', p_from_user_id, p_title, p_message
    );
  END LOOP;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3) Signup trigger — stores profile + role + notifies on admin signup
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_areas text[];
  v_gym_facilities text[];
  v_gym_services text[];
  v_role public.app_role;
  v_admin_approved boolean;
  v_name text;
BEGIN
  IF NEW.raw_user_meta_data ? 'target_areas'
     AND jsonb_typeof(NEW.raw_user_meta_data -> 'target_areas') = 'array'
  THEN
    SELECT array_agg(elem::text) INTO v_target_areas
    FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'target_areas') AS elem;
  END IF;

  IF NEW.raw_user_meta_data ? 'gym_facilities'
     AND jsonb_typeof(NEW.raw_user_meta_data -> 'gym_facilities') = 'array'
  THEN
    SELECT array_agg(elem::text) INTO v_gym_facilities
    FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'gym_facilities') AS elem;
  END IF;

  IF NEW.raw_user_meta_data ? 'gym_services'
     AND jsonb_typeof(NEW.raw_user_meta_data -> 'gym_services') = 'array'
  THEN
    SELECT array_agg(elem::text) INTO v_gym_services
    FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'gym_services') AS elem;
  END IF;

  IF lower(COALESCE(NEW.raw_user_meta_data ->> 'requested_role', 'user')) = 'admin' THEN
    v_role := 'admin'::public.app_role;
    v_admin_approved := false;
  ELSE
    v_role := 'user'::public.app_role;
    v_admin_approved := true;
  END IF;

  v_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (
    id, user_id, email, full_name, phone, address, emergency_contact,
    date_of_birth, gender, weight_kg, height_cm, activity_level, fitness_goal,
    experience_level, target_areas, workout_days_per_week, workout_duration,
    workout_type, preferred_workout_time, admin_approved, is_verified,
    approval_requested_at,
    gym_name, gym_type, gym_city, gym_years_operating, gym_facilities,
    gym_operating_days, gym_peak_hours, gym_member_capacity, gym_services,
    membership_status, membership_type
  ) VALUES (
    NEW.id, NEW.id, NEW.email, v_name,
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'address',
    NEW.raw_user_meta_data ->> 'emergency_contact',
    CASE WHEN COALESCE(NEW.raw_user_meta_data ->> 'date_of_birth', '') <> ''
      THEN (NEW.raw_user_meta_data ->> 'date_of_birth')::date ELSE NULL END,
    NEW.raw_user_meta_data ->> 'gender',
    CASE WHEN COALESCE(NEW.raw_user_meta_data ->> 'weight_kg', '') <> ''
      THEN (NEW.raw_user_meta_data ->> 'weight_kg')::numeric ELSE NULL END,
    CASE WHEN COALESCE(NEW.raw_user_meta_data ->> 'height_cm', '') <> ''
      THEN (NEW.raw_user_meta_data ->> 'height_cm')::numeric ELSE NULL END,
    NEW.raw_user_meta_data ->> 'activity_level',
    NEW.raw_user_meta_data ->> 'fitness_goal',
    NEW.raw_user_meta_data ->> 'experience_level',
    v_target_areas,
    CASE WHEN COALESCE(NEW.raw_user_meta_data ->> 'workout_days_per_week', '') <> ''
      THEN (NEW.raw_user_meta_data ->> 'workout_days_per_week')::integer ELSE NULL END,
    NEW.raw_user_meta_data ->> 'workout_duration',
    NEW.raw_user_meta_data ->> 'workout_type',
    NEW.raw_user_meta_data ->> 'preferred_workout_time',
    v_admin_approved,
    (NEW.email_confirmed_at IS NOT NULL),
    CASE WHEN v_role = 'admin' THEN now() ELSE NULL END,
    NEW.raw_user_meta_data ->> 'gym_name',
    NEW.raw_user_meta_data ->> 'gym_type',
    NEW.raw_user_meta_data ->> 'gym_city',
    NEW.raw_user_meta_data ->> 'gym_years_operating',
    v_gym_facilities,
    CASE WHEN COALESCE(NEW.raw_user_meta_data ->> 'gym_operating_days', '') <> ''
      THEN (NEW.raw_user_meta_data ->> 'gym_operating_days')::integer ELSE NULL END,
    NEW.raw_user_meta_data ->> 'gym_peak_hours',
    NEW.raw_user_meta_data ->> 'gym_member_capacity',
    v_gym_services,
    'active',
    'basic'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    address = COALESCE(EXCLUDED.address, profiles.address),
    emergency_contact = COALESCE(EXCLUDED.emergency_contact, profiles.emergency_contact),
    date_of_birth = COALESCE(EXCLUDED.date_of_birth, profiles.date_of_birth),
    gender = COALESCE(EXCLUDED.gender, profiles.gender),
    weight_kg = COALESCE(EXCLUDED.weight_kg, profiles.weight_kg),
    height_cm = COALESCE(EXCLUDED.height_cm, profiles.height_cm),
    activity_level = COALESCE(EXCLUDED.activity_level, profiles.activity_level),
    fitness_goal = COALESCE(EXCLUDED.fitness_goal, profiles.fitness_goal),
    experience_level = COALESCE(EXCLUDED.experience_level, profiles.experience_level),
    target_areas = COALESCE(EXCLUDED.target_areas, profiles.target_areas),
    workout_days_per_week = COALESCE(EXCLUDED.workout_days_per_week, profiles.workout_days_per_week),
    workout_duration = COALESCE(EXCLUDED.workout_duration, profiles.workout_duration),
    workout_type = COALESCE(EXCLUDED.workout_type, profiles.workout_type),
    preferred_workout_time = COALESCE(EXCLUDED.preferred_workout_time, profiles.preferred_workout_time),
    admin_approved = EXCLUDED.admin_approved,
    approval_requested_at = COALESCE(EXCLUDED.approval_requested_at, profiles.approval_requested_at),
    gym_name = COALESCE(EXCLUDED.gym_name, profiles.gym_name),
    gym_type = COALESCE(EXCLUDED.gym_type, profiles.gym_type),
    gym_city = COALESCE(EXCLUDED.gym_city, profiles.gym_city),
    gym_years_operating = COALESCE(EXCLUDED.gym_years_operating, profiles.gym_years_operating),
    gym_facilities = COALESCE(EXCLUDED.gym_facilities, profiles.gym_facilities),
    gym_operating_days = COALESCE(EXCLUDED.gym_operating_days, profiles.gym_operating_days),
    gym_peak_hours = COALESCE(EXCLUDED.gym_peak_hours, profiles.gym_peak_hours),
    gym_member_capacity = COALESCE(EXCLUDED.gym_member_capacity, profiles.gym_member_capacity),
    gym_services = COALESCE(EXCLUDED.gym_services, profiles.gym_services),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  -- Notify super admins immediately when a gym-owner/admin signs up
  IF v_role = 'admin' THEN
    PERFORM public.notify_approved_admins(
      NEW.id,
      'New admin awaiting approval',
      v_name || ' (' || NEW.email || ') registered as admin/gym owner and needs approval.'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Email confirmed → mark verified + remind super admins again
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := false;
  v_name text;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  THEN
    UPDATE public.profiles
    SET is_verified = true, updated_at = now()
    WHERE user_id = NEW.id;

    SELECT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin'
    ) INTO v_is_admin;

    IF v_is_admin THEN
      UPDATE public.profiles
      SET approval_requested_at = COALESCE(approval_requested_at, now()), updated_at = now()
      WHERE user_id = NEW.id AND COALESCE(admin_approved, false) = false;

      SELECT COALESCE(full_name, NEW.email) INTO v_name
      FROM public.profiles WHERE user_id = NEW.id;

      PERFORM public.notify_approved_admins(
        NEW.id,
        'Admin email verified — approve login',
        COALESCE(v_name, NEW.email) || ' verified their email and is waiting for approval.'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();

-- Sync RPC for the app to call right after signup (backup if trigger missed data)
CREATE OR REPLACE FUNCTION public.sync_my_signup_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_meta jsonb;
  v_email text;
  v_role public.app_role;
  v_admin_approved boolean;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT raw_user_meta_data, email INTO v_meta, v_email
  FROM auth.users WHERE id = v_uid;

  IF lower(COALESCE(v_meta ->> 'requested_role', 'user')) = 'admin' THEN
    v_role := 'admin'::public.app_role;
    v_admin_approved := false;
  ELSE
    v_role := 'user'::public.app_role;
    v_admin_approved := true;
  END IF;

  v_name := COALESCE(v_meta ->> 'full_name', split_part(v_email, '@', 1));

  INSERT INTO public.profiles (
    id, user_id, email, full_name, phone, address, emergency_contact,
    admin_approved, approval_requested_at,
    gym_name, gym_type, gym_city, gym_years_operating,
    gym_operating_days, gym_peak_hours, gym_member_capacity,
    membership_status, membership_type
  ) VALUES (
    v_uid, v_uid, v_email, v_name,
    v_meta ->> 'phone', v_meta ->> 'address', v_meta ->> 'emergency_contact',
    v_admin_approved,
    CASE WHEN v_role = 'admin' THEN now() ELSE NULL END,
    v_meta ->> 'gym_name', v_meta ->> 'gym_type', v_meta ->> 'gym_city',
    v_meta ->> 'gym_years_operating',
    CASE WHEN COALESCE(v_meta ->> 'gym_operating_days', '') <> ''
      THEN (v_meta ->> 'gym_operating_days')::integer ELSE NULL END,
    v_meta ->> 'gym_peak_hours', v_meta ->> 'gym_member_capacity',
    'active', 'basic'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    address = COALESCE(EXCLUDED.address, profiles.address),
    emergency_contact = COALESCE(EXCLUDED.emergency_contact, profiles.emergency_contact),
    admin_approved = EXCLUDED.admin_approved,
    approval_requested_at = COALESCE(profiles.approval_requested_at, EXCLUDED.approval_requested_at),
    gym_name = COALESCE(EXCLUDED.gym_name, profiles.gym_name),
    gym_type = COALESCE(EXCLUDED.gym_type, profiles.gym_type),
    gym_city = COALESCE(EXCLUDED.gym_city, profiles.gym_city),
    gym_years_operating = COALESCE(EXCLUDED.gym_years_operating, profiles.gym_years_operating),
    gym_operating_days = COALESCE(EXCLUDED.gym_operating_days, profiles.gym_operating_days),
    gym_peak_hours = COALESCE(EXCLUDED.gym_peak_hours, profiles.gym_peak_hours),
    gym_member_capacity = COALESCE(EXCLUDED.gym_member_capacity, profiles.gym_member_capacity),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, v_role)
  ON CONFLICT DO NOTHING;

  IF v_role = 'admin' AND NOT EXISTS (
    SELECT 1 FROM public.admin_notifications
    WHERE from_user_id = v_uid AND type = 'admin_approval_request'
  ) THEN
    PERFORM public.notify_approved_admins(
      v_uid,
      'New admin awaiting approval',
      v_name || ' (' || v_email || ') registered as admin/gym owner and needs approval.'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'role', v_role::text, 'admin_approved', v_admin_approved);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_my_signup_profile() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS TABLE(role public.app_role)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;

CREATE OR REPLACE FUNCTION public.check_user_exists(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF check_email IS NULL OR trim(check_email) = '' THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(check_email)))
      OR EXISTS (SELECT 1 FROM public.profiles WHERE email IS NOT NULL AND lower(email) = lower(trim(check_email)));
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO anon, authenticated, service_role;

-- Done. Verify trigger exists:
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
