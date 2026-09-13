-- Update handle_new_user trigger to include gym media fields

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
  v_gym_optional_images_urls text[];
  v_role public.app_role;
  v_admin_approved boolean;
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

    IF lower(COALESCE(NEW.raw_user_meta_data ->> 'requested_role', 'user')) = 'admin' THEN
      v_role := 'admin'::public.app_role;
      v_admin_approved := false;
    ELSE
      v_role := 'user'::public.app_role;
      v_admin_approved := true;
    END IF;

    INSERT INTO public.profiles (
      id,
      user_id,
      email,
      full_name,
      phone,
      address,
      emergency_contact,
      date_of_birth,
      gender,
      weight_kg,
      height_cm,
      activity_level,
      fitness_goal,
      experience_level,
      target_areas,
      workout_days_per_week,
      workout_duration,
      workout_type,
      preferred_workout_time,
      admin_approved,
      gym_name,
      gym_type,
      gym_city,
      gym_years_operating,
      gym_facilities,
      gym_operating_days,
      gym_peak_hours,
      gym_member_capacity,
      gym_services,
      gym_main_image_url,
      gym_optional_images_urls,
      gym_video_url,
      gym_video_file_url
    )
    VALUES (
      NEW.id,
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data ->> 'phone',
      NEW.raw_user_meta_data ->> 'address',
      NEW.raw_user_meta_data ->> 'emergency_contact',
      CASE
        WHEN (NEW.raw_user_meta_data ->> 'date_of_birth') IS NOT NULL
         AND (NEW.raw_user_meta_data ->> 'date_of_birth') <> ''
        THEN (NEW.raw_user_meta_data ->> 'date_of_birth')::date
        ELSE NULL
      END,
      NEW.raw_user_meta_data ->> 'gender',
      CASE
        WHEN (NEW.raw_user_meta_data ->> 'weight_kg') IS NOT NULL
         AND (NEW.raw_user_meta_data ->> 'weight_kg') <> ''
        THEN (NEW.raw_user_meta_data ->> 'weight_kg')::numeric
        ELSE NULL
      END,
      CASE
        WHEN (NEW.raw_user_meta_data ->> 'height_cm') IS NOT NULL
         AND (NEW.raw_user_meta_data ->> 'height_cm') <> ''
        THEN (NEW.raw_user_meta_data ->> 'height_cm')::numeric
        ELSE NULL
      END,
      NEW.raw_user_meta_data ->> 'activity_level',
      NEW.raw_user_meta_data ->> 'fitness_goal',
      NEW.raw_user_meta_data ->> 'experience_level',
      v_target_areas,
      CASE
        WHEN (NEW.raw_user_meta_data ->> 'workout_days_per_week') IS NOT NULL
         AND (NEW.raw_user_meta_data ->> 'workout_days_per_week') <> ''
        THEN (NEW.raw_user_meta_data ->> 'workout_days_per_week')::integer
        ELSE NULL
      END,
      NEW.raw_user_meta_data ->> 'workout_duration',
      NEW.raw_user_meta_data ->> 'workout_type',
      NEW.raw_user_meta_data ->> 'preferred_workout_time',
      v_admin_approved,
      NEW.raw_user_meta_data ->> 'gym_name',
      NEW.raw_user_meta_data ->> 'gym_type',
      NEW.raw_user_meta_data ->> 'gym_city',
      NEW.raw_user_meta_data ->> 'gym_years_operating',
      v_gym_facilities,
      CASE
        WHEN (NEW.raw_user_meta_data ->> 'gym_operating_days') IS NOT NULL
         AND (NEW.raw_user_meta_data ->> 'gym_operating_days') <> ''
        THEN (NEW.raw_user_meta_data ->> 'gym_operating_days')::integer
        ELSE NULL
      END,
      NEW.raw_user_meta_data ->> 'gym_peak_hours',
      NEW.raw_user_meta_data ->> 'gym_member_capacity',
      v_gym_services,
      NEW.raw_user_meta_data ->> 'gym_main_image_url',
      v_gym_optional_images_urls,
      NEW.raw_user_meta_data ->> 'gym_video_url',
      NEW.raw_user_meta_data ->> 'gym_video_file_url'
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
      gym_name              = COALESCE(EXCLUDED.gym_name,              profiles.gym_name),
      gym_type              = COALESCE(EXCLUDED.gym_type,              profiles.gym_type),
      gym_city              = COALESCE(EXCLUDED.gym_city,              profiles.gym_city),
      gym_years_operating   = COALESCE(EXCLUDED.gym_years_operating,   profiles.gym_years_operating),
      gym_facilities        = COALESCE(EXCLUDED.gym_facilities,        profiles.gym_facilities),
      gym_operating_days    = COALESCE(EXCLUDED.gym_operating_days,    profiles.gym_operating_days),
      gym_peak_hours        = COALESCE(EXCLUDED.gym_peak_hours,        profiles.gym_peak_hours),
      gym_member_capacity   = COALESCE(EXCLUDED.gym_member_capacity,   profiles.gym_member_capacity),
      gym_services          = COALESCE(EXCLUDED.gym_services,          profiles.gym_services),
      gym_main_image_url    = COALESCE(EXCLUDED.gym_main_image_url,    profiles.gym_main_image_url),
      gym_optional_images_urls = COALESCE(EXCLUDED.gym_optional_images_urls, profiles.gym_optional_images_urls),
      gym_video_url         = COALESCE(EXCLUDED.gym_video_url,         profiles.gym_video_url),
      gym_video_file_url    = COALESCE(EXCLUDED.gym_video_file_url,    profiles.gym_video_file_url),
      updated_at            = now();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profile insert failed: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      NEW.id,
      CASE
        WHEN lower(COALESCE(NEW.raw_user_meta_data ->> 'requested_role', 'user')) = 'admin'
        THEN 'admin'::public.app_role
        ELSE 'user'::public.app_role
      END
    )
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user role insert failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
