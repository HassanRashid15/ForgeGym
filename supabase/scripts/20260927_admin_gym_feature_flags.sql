-- Gym owner feature flags: Classes, Schedule, Membership sidebar visibility
-- Defaults OFF so gyms opt in when ready (many grow into these later)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS feature_classes_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS feature_schedule_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS feature_membership_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.feature_classes_enabled IS 'When true, Classes appears in the dashboard sidebar for this gym';
COMMENT ON COLUMN profiles.feature_schedule_enabled IS 'When true, Schedule appears in the dashboard sidebar for this gym';
COMMENT ON COLUMN profiles.feature_membership_enabled IS 'When true, Membership appears in the dashboard sidebar for this gym';
