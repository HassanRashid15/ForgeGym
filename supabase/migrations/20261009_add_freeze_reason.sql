-- Add freeze reason column to track why account was frozen
-- This helps distinguish between manual freezes and trial expiration freezes

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS freeze_reason TEXT;

-- Add check constraint to ensure valid values (guarded: constraint may
-- already exist on projects where it was applied manually)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'freeze_reason_check' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE profiles
    ADD CONSTRAINT freeze_reason_check
    CHECK (freeze_reason IS NULL OR freeze_reason IN ('manual', 'trial_expiration'));
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN profiles.freeze_reason IS 'Reason for account freeze: manual (admin action) or trial_expiration (trial timer expired)';
