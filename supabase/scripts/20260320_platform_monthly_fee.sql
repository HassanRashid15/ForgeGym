-- Per gym-owner platform monthly fee (set by super admin; owed after free trial)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS platform_monthly_fee text;

COMMENT ON COLUMN public.profiles.platform_monthly_fee IS
  'Monthly platform fee for this gym owner, set by super admin. Falls back to global platform_facility_fee when null.';
