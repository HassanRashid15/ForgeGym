-- Fix: profiles.id was NOT NULL without a usable DEFAULT, so inserts that only
-- set user_id failed with: null value in column "id" violates not-null constraint

-- Restore auto UUID default (safe even if already present)
ALTER TABLE public.profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Keep signup trigger in sync: always set id = auth user id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_areas text[];
BEGIN
  BEGIN
    IF NEW.raw_user_meta_data ? 'target_areas'
       AND jsonb_typeof(NEW.raw_user_meta_data -> 'target_areas') = 'array'
    THEN
      SELECT array_agg(elem::text)
      INTO v_target_areas
      FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'target_areas') AS elem;
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
      preferred_workout_time
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
      NEW.raw_user_meta_data ->> 'preferred_workout_time'
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
      updated_at            = now();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profile insert failed: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user role insert failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
