-- Add freeze functionality for member accounts
-- This allows admins to temporarily freeze member accounts (e.g., for gym leave)
-- Frozen accounts cannot sign in until unfrozen

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS frozen_until TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN profiles.is_frozen IS 'Whether the user account is frozen (cannot sign in)';
COMMENT ON COLUMN profiles.frozen_until IS 'Optional timestamp for automatic unfreeze (null = manual unfreeze only)';
