-- Add specific operating days field to store which days the gym is open
-- Safe to re-run: skips if column already exists

ALTER TABLE gyms
ADD COLUMN IF NOT EXISTS operating_days_specific TEXT[];

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS gym_operating_days_specific TEXT[];

COMMENT ON COLUMN gyms.operating_days_specific IS 'Array of specific operating days (e.g., ["Mon", "Tue", "Wed", "Thu", "Fri"])';
COMMENT ON COLUMN profiles.gym_operating_days_specific IS 'Array of specific operating days from profile (fallback for gyms table)';
