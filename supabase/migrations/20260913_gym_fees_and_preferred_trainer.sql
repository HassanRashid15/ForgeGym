-- Gym pricing + preferred trainer for members

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gym_monthly_fee text,
  ADD COLUMN IF NOT EXISTS gym_trainer_fee text,
  ADD COLUMN IF NOT EXISTS preferred_trainer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS monthly_fee text,
  ADD COLUMN IF NOT EXISTS trainer_fee text;

CREATE INDEX IF NOT EXISTS profiles_preferred_trainer_id_idx
  ON public.profiles (preferred_trainer_id)
  WHERE preferred_trainer_id IS NOT NULL;

-- Keep public gyms catalog in sync with owner fee fields
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
      monthly_fee, trainer_fee, updated_at
    ) VALUES (
      NEW.user_id, trim(NEW.gym_name), NEW.gym_type, NEW.gym_city,
      COALESCE(NEW.gym_facilities, '{}'), COALESCE(NEW.gym_services, '{}'),
      NEW.gym_peak_hours, NEW.gym_member_capacity, NEW.gym_years_operating,
      NEW.gym_operating_days, NEW.bio, NEW.avatar_url, NEW.full_name,
      true,
      NEW.gym_monthly_fee, NEW.gym_trainer_fee,
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
      monthly_fee = EXCLUDED.monthly_fee,
      trainer_fee = EXCLUDED.trainer_fee,
      updated_at = now();
  ELSE
    UPDATE public.gyms
    SET is_published = false, updated_at = now()
    WHERE owner_user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;
