-- Add column to track if welcome modal has been shown to approved admins
-- Safe to re-run: skips if the column already exists

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS welcome_modal_shown BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.welcome_modal_shown IS 'Tracks if admin has seen the welcome modal after approval';
