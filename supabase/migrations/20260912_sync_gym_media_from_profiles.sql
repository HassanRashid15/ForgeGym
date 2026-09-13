-- Keep public.gyms media columns in sync when profile media changes.

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
      bio, avatar_url, owner_display_name, is_published,
      main_image_url, optional_images_urls, video_url, video_file_url,
      updated_at
    ) VALUES (
      NEW.user_id, trim(NEW.gym_name), NEW.gym_type, NEW.gym_city,
      COALESCE(NEW.gym_facilities, '{}'), COALESCE(NEW.gym_services, '{}'),
      NEW.gym_peak_hours, NEW.gym_member_capacity, NEW.gym_years_operating,
      NEW.gym_operating_days, NEW.bio, NEW.avatar_url, NEW.full_name,
      true,
      NEW.gym_main_image_url, NEW.gym_optional_images_urls,
      NEW.gym_video_url, NEW.gym_video_file_url,
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
    bio, avatar_url, full_name, admin_approved, is_super_admin,
    gym_main_image_url, gym_optional_images_urls, gym_video_url, gym_video_file_url
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_gym_from_profile();

-- Backfill catalog media from profiles
UPDATE public.gyms g
SET
  main_image_url = p.gym_main_image_url,
  optional_images_urls = p.gym_optional_images_urls,
  video_url = p.gym_video_url,
  video_file_url = p.gym_video_file_url,
  updated_at = now()
FROM public.profiles p
WHERE g.owner_user_id = p.user_id
  AND (
    p.gym_main_image_url IS NOT NULL
    OR (p.gym_optional_images_urls IS NOT NULL AND cardinality(p.gym_optional_images_urls) > 0)
    OR p.gym_video_url IS NOT NULL
    OR p.gym_video_file_url IS NOT NULL
  );
