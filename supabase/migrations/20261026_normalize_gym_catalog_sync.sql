-- Phase 1: Close profiles → gyms sync gaps, backfill catalog, uniqueness for names.
-- Gym attribute SoT is public.gyms; profiles.gym_* remain temporarily for dual-write.

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
     AND NULLIF(trim(COALESCE(NEW.gym_name, '')), '') IS NOT NULL
  THEN
    INSERT INTO public.gyms AS g (
      owner_user_id, name, gym_type, city, facilities, services,
      peak_hours, member_capacity, years_operating, operating_days,
      bio, avatar_url, owner_display_name, is_published,
      main_image_url, optional_images_urls, video_url, video_file_url,
      monthly_fee, trainer_fee,
      latitude, longitude,
      opening_time, closing_time, operating_days_specific,
      updated_at
    ) VALUES (
      NEW.user_id, trim(NEW.gym_name), NEW.gym_type, NEW.gym_city,
      COALESCE(NEW.gym_facilities, '{}'), COALESCE(NEW.gym_services, '{}'),
      NEW.gym_peak_hours, NEW.gym_member_capacity, NEW.gym_years_operating,
      NEW.gym_operating_days, NEW.bio, NEW.avatar_url, NEW.full_name,
      true,
      NEW.gym_main_image_url, NEW.gym_optional_images_urls,
      NEW.gym_video_url, NEW.gym_video_file_url,
      NEW.gym_monthly_fee, NEW.gym_trainer_fee,
      NEW.gym_latitude, NEW.gym_longitude,
      NEW.gym_opening_time, NEW.gym_closing_time, NEW.gym_operating_days_specific,
      now()
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
      main_image_url = EXCLUDED.main_image_url,
      optional_images_urls = EXCLUDED.optional_images_urls,
      video_url = EXCLUDED.video_url,
      video_file_url = EXCLUDED.video_file_url,
      monthly_fee = EXCLUDED.monthly_fee,
      trainer_fee = EXCLUDED.trainer_fee,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      opening_time = EXCLUDED.opening_time,
      closing_time = EXCLUDED.closing_time,
      operating_days_specific = EXCLUDED.operating_days_specific,
      updated_at = now();
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
  AFTER INSERT OR UPDATE OF
    gym_name, gym_type, gym_city, gym_facilities, gym_services,
    gym_peak_hours, gym_member_capacity, gym_years_operating, gym_operating_days,
    gym_operating_days_specific, gym_opening_time, gym_closing_time,
    bio, avatar_url, full_name, admin_approved, is_super_admin,
    gym_main_image_url, gym_optional_images_urls, gym_video_url, gym_video_file_url,
    gym_monthly_fee, gym_trainer_fee, gym_latitude, gym_longitude
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gym_from_profile();

-- Backfill / heal gyms rows from approved admin profiles (including hours).
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
  true,
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
  AND COALESCE(p.admin_approved, false) = true
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
  is_published = true,
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
  updated_at = now();

-- Also upsert unpublished draft rows for pending admin owners (so uniqueness/check-gym work).
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
  false,
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
  AND COALESCE(p.admin_approved, false) = false
  AND NULLIF(trim(COALESCE(p.gym_name, '')), '') IS NOT NULL
ON CONFLICT (owner_user_id) DO NOTHING;

-- Unique gym name+city (case-insensitive). Skip if duplicates already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM (
      SELECT lower(trim(name)) AS n, lower(trim(coalesce(city, ''))) AS c, count(*) AS cnt
      FROM public.gyms
      WHERE NULLIF(trim(name), '') IS NOT NULL
      GROUP BY 1, 2
      HAVING count(*) > 1
    ) d
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS gyms_name_city_unique_idx
      ON public.gyms (lower(trim(name)), lower(trim(coalesce(city, ''))));
  ELSE
    RAISE NOTICE 'Skipping gyms_name_city_unique_idx: duplicate name+city rows exist';
    CREATE INDEX IF NOT EXISTS gyms_name_city_lookup_idx
      ON public.gyms (lower(trim(name)), lower(trim(coalesce(city, ''))));
  END IF;
END $$;
