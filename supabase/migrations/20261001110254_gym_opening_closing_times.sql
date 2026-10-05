-- Add opening and closing time fields to gyms table and profiles table
-- Safe to re-run: skips if columns already exist

ALTER TABLE gyms
ADD COLUMN IF NOT EXISTS opening_time TEXT,
ADD COLUMN IF NOT EXISTS closing_time TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS gym_opening_time TEXT,
ADD COLUMN IF NOT EXISTS gym_closing_time TEXT;

COMMENT ON COLUMN gyms.opening_time IS 'Gym opening time (e.g., "6:00 AM")';
COMMENT ON COLUMN gyms.closing_time IS 'Gym closing time (e.g., "10:00 PM")';
COMMENT ON COLUMN profiles.gym_opening_time IS 'Gym opening time from profile (fallback for gyms table)';
COMMENT ON COLUMN profiles.gym_closing_time IS 'Gym closing time from profile (fallback for gyms table)';
