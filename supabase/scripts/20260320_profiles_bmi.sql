-- Persist calculated BMI on profiles (from weight_kg + height_cm)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bmi numeric;

COMMENT ON COLUMN public.profiles.bmi IS
  'Body mass index computed from weight_kg and height_cm; refreshed when those change';

-- Backfill existing rows that already have weight + height
UPDATE public.profiles
SET bmi = ROUND(
  (weight_kg / POWER(height_cm / 100.0, 2))::numeric,
  1
)
WHERE weight_kg IS NOT NULL
  AND height_cm IS NOT NULL
  AND weight_kg > 0
  AND height_cm > 0
  AND bmi IS NULL;
