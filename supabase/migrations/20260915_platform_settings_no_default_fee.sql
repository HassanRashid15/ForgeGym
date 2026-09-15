-- Remove hardcoded platform facility fee seed (Rs 4999).
-- Fee is set dynamically by super admin only.
DELETE FROM public.platform_settings
WHERE key = 'platform_facility_fee'
  AND value = 'Rs 4999';
