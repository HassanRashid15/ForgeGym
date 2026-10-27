-- Phase 4: gyms is sole SoT for gym attributes; slim profiles; retire dead dual systems.
-- Prerequisite: 20261026_normalize_gym_catalog_sync.sql + app write/read cutover.

-- ---------------------------------------------------------------------------
-- Final backfill from profiles → gyms before dropping columns
-- ---------------------------------------------------------------------------
INSERT INTO public.gyms AS g (
  owner_user_id, name, gym_type, city, facilities, services,
  peak_hours, member_capacity, years_operating, operating_days,
  bio, avatar_url, owner_display_name, is_published,
  main_image_url, optional_images_urls, video_url, video_file_url,
  monthly_fee, trainer_fee, latitude, longitude,
  opening_time, closing_time, operating_days_specific,
  updated_at
)
SELECT
  p.user_id,
  trim(p.gym_name),
  p.gym_type,
  p.gym_city,
  COALESCE(p.gym_facilities, '{}'),
  COALESCE(p.gym_services, '{}'),
  p.gym_peak_hours,
  p.gym_member_capacity,
  p.gym_years_operating,
  p.gym_operating_days,
  p.bio,
  p.avatar_url,
  p.full_name,
  CASE
    WHEN COALESCE(p.admin_approved, false) = true
         AND COALESCE(p.is_super_admin, false) = false
    THEN true ELSE false
  END,
  p.gym_main_image_url,
  p.gym_optional_images_urls,
  p.gym_video_url,
  p.gym_video_file_url,
  p.gym_monthly_fee,
  p.gym_trainer_fee,
  p.gym_latitude,
  p.gym_longitude,
  p.gym_opening_time,
  p.gym_closing_time,
  p.gym_operating_days_specific,
  now()
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'admin'
WHERE COALESCE(p.is_super_admin, false) = false
  AND NULLIF(trim(COALESCE(p.gym_name, '')), '') IS NOT NULL
ON CONFLICT (owner_user_id) DO UPDATE SET
  name = COALESCE(NULLIF(trim(g.name), ''), EXCLUDED.name),
  gym_type = COALESCE(g.gym_type, EXCLUDED.gym_type),
  city = COALESCE(g.city, EXCLUDED.city),
  facilities = CASE WHEN g.facilities IS NULL OR g.facilities = '{}' THEN EXCLUDED.facilities ELSE g.facilities END,
  services = CASE WHEN g.services IS NULL OR g.services = '{}' THEN EXCLUDED.services ELSE g.services END,
  peak_hours = COALESCE(g.peak_hours, EXCLUDED.peak_hours),
  member_capacity = COALESCE(g.member_capacity, EXCLUDED.member_capacity),
  years_operating = COALESCE(g.years_operating, EXCLUDED.years_operating),
  operating_days = COALESCE(g.operating_days, EXCLUDED.operating_days),
  bio = COALESCE(g.bio, EXCLUDED.bio),
  avatar_url = COALESCE(g.avatar_url, EXCLUDED.avatar_url),
  owner_display_name = COALESCE(g.owner_display_name, EXCLUDED.owner_display_name),
  main_image_url = COALESCE(g.main_image_url, EXCLUDED.main_image_url),
  optional_images_urls = COALESCE(g.optional_images_urls, EXCLUDED.optional_images_urls),
  video_url = COALESCE(g.video_url, EXCLUDED.video_url),
  video_file_url = COALESCE(g.video_file_url, EXCLUDED.video_file_url),
  monthly_fee = COALESCE(g.monthly_fee, EXCLUDED.monthly_fee),
  trainer_fee = COALESCE(g.trainer_fee, EXCLUDED.trainer_fee),
  latitude = COALESCE(g.latitude, EXCLUDED.latitude),
  longitude = COALESCE(g.longitude, EXCLUDED.longitude),
  opening_time = COALESCE(g.opening_time, EXCLUDED.opening_time),
  closing_time = COALESCE(g.closing_time, EXCLUDED.closing_time),
  operating_days_specific = COALESCE(g.operating_days_specific, EXCLUDED.operating_days_specific),
  is_published = EXCLUDED.is_published OR g.is_published,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Publish toggle only (gym attrs no longer live on profiles)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_gym_from_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin'
  ) INTO is_admin;

  IF is_admin
     AND COALESCE(NEW.is_super_admin, false) = false
     AND COALESCE(NEW.admin_approved, false) = true
  THEN
    UPDATE public.gyms
    SET
      is_published = true,
      owner_display_name = COALESCE(NEW.full_name, owner_display_name),
      avatar_url = COALESCE(NEW.avatar_url, avatar_url),
      bio = COALESCE(NEW.bio, bio),
      updated_at = now()
    WHERE owner_user_id = NEW.user_id;
  ELSE
    UPDATE public.gyms
    SET is_published = false, updated_at = now()
    WHERE owner_user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_sync_gym ON public.profiles;
CREATE TRIGGER profiles_sync_gym
  AFTER INSERT OR UPDATE OF admin_approved, is_super_admin, full_name, avatar_url, bio
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gym_from_profile();

-- ---------------------------------------------------------------------------
-- handle_new_user: person fields on profiles; gym catalog on gyms for admins
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_target_areas text[];
  v_gym_facilities text[];
  v_gym_services text[];
  v_gym_optional_images_urls text[];
  v_role public.app_role;
  v_admin_approved boolean;
  v_gym_owner_id uuid;
  v_membership_status text;
  v_gym_name text;
BEGIN
  BEGIN
    IF NEW.raw_user_meta_data ? 'target_areas'
       AND jsonb_typeof(NEW.raw_user_meta_data -> 'target_areas') = 'array'
    THEN
      SELECT array_agg(elem::text)
      INTO v_target_areas
      FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'target_areas') AS elem;
    END IF;

    IF NEW.raw_user_meta_data ? 'gym_facilities'
       AND jsonb_typeof(NEW.raw_user_meta_data -> 'gym_facilities') = 'array'
    THEN
      SELECT array_agg(elem::text)
      INTO v_gym_facilities
      FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'gym_facilities') AS elem;
    END IF;

    IF NEW.raw_user_meta_data ? 'gym_services'
       AND jsonb_typeof(NEW.raw_user_meta_data -> 'gym_services') = 'array'
    THEN
      SELECT array_agg(elem::text)
      INTO v_gym_services
      FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'gym_services') AS elem;
    END IF;

    IF NEW.raw_user_meta_data ? 'gym_optional_images_urls'
       AND jsonb_typeof(NEW.raw_user_meta_data -> 'gym_optional_images_urls') = 'array'
    THEN
      SELECT array_agg(elem::text)
      INTO v_gym_optional_images_urls
      FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'gym_optional_images_urls') AS elem;
    END IF;

    BEGIN
      IF NEW.raw_user_meta_data ? 'gym_owner_id'
         AND NULLIF(trim(NEW.raw_user_meta_data ->> 'gym_owner_id'), '') IS NOT NULL
      THEN
        v_gym_owner_id := (NEW.raw_user_meta_data ->> 'gym_owner_id')::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_gym_owner_id := NULL;
    END;

    IF lower(COALESCE(NEW.raw_user_meta_data ->> 'requested_role', 'user')) = 'admin' THEN
      v_role := 'admin'::public.app_role;
      v_admin_approved := false;
      v_gym_owner_id := NEW.id;
      v_membership_status := 'pending';
    ELSIF v_gym_owner_id IS NOT NULL THEN
      v_role := 'user'::public.app_role;
      v_admin_approved := false;
      v_membership_status := 'pending';
    ELSE
      v_role := 'user'::public.app_role;
      v_admin_approved := true;
      v_membership_status := 'active';
    END IF;

    INSERT INTO public.profiles (
      id, user_id, email, full_name, phone, address, emergency_contact,
      date_of_birth, gender, weight_kg, height_cm, activity_level, fitness_goal,
      experience_level, target_areas, workout_days_per_week, workout_duration,
      workout_type, preferred_workout_time, admin_approved, membership_status,
      membership_type, gym_owner_id
    )
    VALUES (
      NEW.id, NEW.id, NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data ->> 'phone',
      NEW.raw_user_meta_data ->> 'address',
      NEW.raw_user_meta_data ->> 'emergency_contact',
      NULLIF(NEW.raw_user_meta_data ->> 'date_of_birth', '')::date,
      NEW.raw_user_meta_data ->> 'gender',
      NULLIF(NEW.raw_user_meta_data ->> 'weight_kg', '')::numeric,
      NULLIF(NEW.raw_user_meta_data ->> 'height_cm', '')::numeric,
      NEW.raw_user_meta_data ->> 'activity_level',
      NEW.raw_user_meta_data ->> 'fitness_goal',
      NEW.raw_user_meta_data ->> 'experience_level',
      v_target_areas,
      NULLIF(NEW.raw_user_meta_data ->> 'workout_days_per_week', '')::integer,
      NEW.raw_user_meta_data ->> 'workout_duration',
      NEW.raw_user_meta_data ->> 'workout_type',
      NEW.raw_user_meta_data ->> 'preferred_workout_time',
      v_admin_approved,
      v_membership_status,
      'basic',
      v_gym_owner_id
    )
    ON CONFLICT (user_id) DO UPDATE SET
      phone                 = COALESCE(EXCLUDED.phone,                 profiles.phone),
      address               = COALESCE(EXCLUDED.address,               profiles.address),
      emergency_contact     = COALESCE(EXCLUDED.emergency_contact,     profiles.emergency_contact),
      date_of_birth         = COALESCE(EXCLUDED.date_of_birth,         profiles.date_of_birth),
      gender                = COALESCE(EXCLUDED.gender,                profiles.gender),
      weight_kg             = COALESCE(EXCLUDED.weight_kg,             profiles.weight_kg),
      height_cm             = COALESCE(EXCLUDED.height_cm,             profiles.height_cm),
      activity_level        = COALESCE(EXCLUDED.activity_level,        profiles.activity_level),
      fitness_goal          = COALESCE(EXCLUDED.fitness_goal,          profiles.fitness_goal),
      experience_level      = COALESCE(EXCLUDED.experience_level,      profiles.experience_level),
      target_areas          = COALESCE(EXCLUDED.target_areas,          profiles.target_areas),
      workout_days_per_week = COALESCE(EXCLUDED.workout_days_per_week, profiles.workout_days_per_week),
      workout_duration      = COALESCE(EXCLUDED.workout_duration,      profiles.workout_duration),
      workout_type          = COALESCE(EXCLUDED.workout_type,          profiles.workout_type),
      preferred_workout_time= COALESCE(EXCLUDED.preferred_workout_time,profiles.preferred_workout_time),
      admin_approved        = COALESCE(EXCLUDED.admin_approved,        profiles.admin_approved),
      membership_status     = COALESCE(EXCLUDED.membership_status,     profiles.membership_status),
      gym_owner_id          = COALESCE(EXCLUDED.gym_owner_id,          profiles.gym_owner_id),
      updated_at            = now();

    -- Admin signup → draft gym catalog row
    IF v_role = 'admin' THEN
      v_gym_name := NULLIF(trim(COALESCE(NEW.raw_user_meta_data ->> 'gym_name', '')), '');
      IF v_gym_name IS NOT NULL THEN
        INSERT INTO public.gyms (
          owner_user_id, name, gym_type, city, facilities, services,
          years_operating, operating_days, peak_hours, member_capacity,
          owner_display_name, is_published,
          main_image_url, optional_images_urls, video_url, video_file_url,
          updated_at
        ) VALUES (
          NEW.id, v_gym_name,
          NEW.raw_user_meta_data ->> 'gym_type',
          NEW.raw_user_meta_data ->> 'gym_city',
          COALESCE(v_gym_facilities, '{}'),
          COALESCE(v_gym_services, '{}'),
          NEW.raw_user_meta_data ->> 'gym_years_operating',
          NULLIF(NEW.raw_user_meta_data ->> 'gym_operating_days', '')::integer,
          NEW.raw_user_meta_data ->> 'gym_peak_hours',
          NEW.raw_user_meta_data ->> 'gym_member_capacity',
          COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
          false,
          NEW.raw_user_meta_data ->> 'gym_main_image_url',
          v_gym_optional_images_urls,
          NEW.raw_user_meta_data ->> 'gym_video_url',
          NEW.raw_user_meta_data ->> 'gym_video_file_url',
          now()
        )
        ON CONFLICT (owner_user_id) DO UPDATE SET
          name = EXCLUDED.name,
          gym_type = COALESCE(EXCLUDED.gym_type, gyms.gym_type),
          city = COALESCE(EXCLUDED.city, gyms.city),
          facilities = COALESCE(EXCLUDED.facilities, gyms.facilities),
          services = COALESCE(EXCLUDED.services, gyms.services),
          years_operating = COALESCE(EXCLUDED.years_operating, gyms.years_operating),
          operating_days = COALESCE(EXCLUDED.operating_days, gyms.operating_days),
          peak_hours = COALESCE(EXCLUDED.peak_hours, gyms.peak_hours),
          member_capacity = COALESCE(EXCLUDED.member_capacity, gyms.member_capacity),
          main_image_url = COALESCE(EXCLUDED.main_image_url, gyms.main_image_url),
          optional_images_urls = COALESCE(EXCLUDED.optional_images_urls, gyms.optional_images_urls),
          video_url = COALESCE(EXCLUDED.video_url, gyms.video_url),
          video_file_url = COALESCE(EXCLUDED.video_file_url, gyms.video_file_url),
          owner_display_name = COALESCE(EXCLUDED.owner_display_name, gyms.owner_display_name),
          updated_at = now();
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profile/gym insert failed: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user role insert failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- sync_my_signup_profile: no gym_* on profiles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_my_signup_profile()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_meta jsonb;
  v_email text;
  v_role public.app_role;
  v_admin_approved boolean;
  v_name text;
  v_gym_name text;
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
    gym_owner_id,
    membership_status, membership_type
  ) VALUES (
    v_uid, v_uid, v_email, v_name,
    v_meta ->> 'phone', v_meta ->> 'address', v_meta ->> 'emergency_contact',
    v_admin_approved,
    CASE WHEN v_role = 'admin' THEN now() ELSE NULL END,
    CASE WHEN v_role = 'admin' THEN v_uid ELSE NULL END,
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
    gym_owner_id = COALESCE(EXCLUDED.gym_owner_id, profiles.gym_owner_id),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, v_role)
  ON CONFLICT DO NOTHING;

  IF v_role = 'admin' THEN
    v_gym_name := NULLIF(trim(COALESCE(v_meta ->> 'gym_name', '')), '');
    IF v_gym_name IS NOT NULL THEN
      INSERT INTO public.gyms (
        owner_user_id, name, gym_type, city,
        years_operating, operating_days, peak_hours, member_capacity,
        owner_display_name, is_published, updated_at
      ) VALUES (
        v_uid, v_gym_name,
        v_meta ->> 'gym_type',
        v_meta ->> 'gym_city',
        v_meta ->> 'gym_years_operating',
        CASE WHEN COALESCE(v_meta ->> 'gym_operating_days', '') <> ''
          THEN (v_meta ->> 'gym_operating_days')::integer ELSE NULL END,
        v_meta ->> 'gym_peak_hours',
        v_meta ->> 'gym_member_capacity',
        v_name,
        false,
        now()
      )
      ON CONFLICT (owner_user_id) DO UPDATE SET
        name = EXCLUDED.name,
        gym_type = COALESCE(EXCLUDED.gym_type, gyms.gym_type),
        city = COALESCE(EXCLUDED.city, gyms.city),
        years_operating = COALESCE(EXCLUDED.years_operating, gyms.years_operating),
        operating_days = COALESCE(EXCLUDED.operating_days, gyms.operating_days),
        peak_hours = COALESCE(EXCLUDED.peak_hours, gyms.peak_hours),
        member_capacity = COALESCE(EXCLUDED.member_capacity, gyms.member_capacity),
        owner_display_name = COALESCE(EXCLUDED.owner_display_name, gyms.owner_display_name),
        updated_at = now();
    END IF;
  END IF;

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
$function$;

-- ---------------------------------------------------------------------------
-- Numeric fees on gyms (safe cast of text → numeric)
-- ---------------------------------------------------------------------------
ALTER TABLE public.gyms
  ALTER COLUMN monthly_fee TYPE numeric
  USING (
    CASE
      WHEN monthly_fee IS NULL OR trim(monthly_fee::text) = '' THEN NULL
      WHEN trim(monthly_fee::text) ~ '^[0-9]+(\.[0-9]+)?$' THEN trim(monthly_fee::text)::numeric
      ELSE NULL
    END
  );

ALTER TABLE public.gyms
  ALTER COLUMN trainer_fee TYPE numeric
  USING (
    CASE
      WHEN trainer_fee IS NULL OR trim(trainer_fee::text) = '' THEN NULL
      WHEN trim(trainer_fee::text) ~ '^[0-9]+(\.[0-9]+)?$' THEN trim(trainer_fee::text)::numeric
      ELSE NULL
    END
  );

-- ---------------------------------------------------------------------------
-- Fix legacy RLS that depended on profiles.role / profiles.is_approved
-- Drop ANY profiles policy still referencing those columns before DROP COLUMN,
-- otherwise SELECTs fail at runtime with: column "role" does not exist.
-- ---------------------------------------------------------------------------
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
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Super admins can approve admins" ON public.profiles;
CREATE POLICY "Super admins can approve admins" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO public
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Drop duplicated gym attribute columns from profiles (keep gym_owner_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS gym_name,
  DROP COLUMN IF EXISTS gym_type,
  DROP COLUMN IF EXISTS gym_city,
  DROP COLUMN IF EXISTS gym_years_operating,
  DROP COLUMN IF EXISTS gym_facilities,
  DROP COLUMN IF EXISTS gym_operating_days,
  DROP COLUMN IF EXISTS gym_operating_days_specific,
  DROP COLUMN IF EXISTS gym_peak_hours,
  DROP COLUMN IF EXISTS gym_opening_time,
  DROP COLUMN IF EXISTS gym_closing_time,
  DROP COLUMN IF EXISTS gym_member_capacity,
  DROP COLUMN IF EXISTS gym_services,
  DROP COLUMN IF EXISTS gym_main_image_url,
  DROP COLUMN IF EXISTS gym_optional_images_urls,
  DROP COLUMN IF EXISTS gym_video_url,
  DROP COLUMN IF EXISTS gym_video_file_url,
  DROP COLUMN IF EXISTS gym_monthly_fee,
  DROP COLUMN IF EXISTS gym_trainer_fee,
  DROP COLUMN IF EXISTS gym_latitude,
  DROP COLUMN IF EXISTS gym_longitude,
  DROP COLUMN IF EXISTS is_approved,
  DROP COLUMN IF EXISTS role;

-- ---------------------------------------------------------------------------
-- Drop unused BMI history table (app uses profiles.bmi)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_bmi_records_updated_at ON public.bmi_records;
DROP POLICY IF EXISTS "Users can delete own BMI records" ON public.bmi_records;
DROP POLICY IF EXISTS "Users can insert own BMI records" ON public.bmi_records;
DROP POLICY IF EXISTS "Users can update own BMI records" ON public.bmi_records;
DROP POLICY IF EXISTS "Users can view own BMI records" ON public.bmi_records;
DROP TABLE IF EXISTS public.bmi_records;

COMMENT ON TABLE public.gyms IS 'Canonical gym catalog — source of truth for gym attributes (name, fees, media, hours). Tenancy remains via owner_user_id / profiles.gym_owner_id.';
COMMENT ON COLUMN public.profiles.gym_owner_id IS 'Tenant link to gym owner auth user id (not gyms.id). Gym attributes live on public.gyms.';
COMMENT ON COLUMN public.profiles.user_id IS 'Application profile key (preferred over profiles.id for lookups).';
