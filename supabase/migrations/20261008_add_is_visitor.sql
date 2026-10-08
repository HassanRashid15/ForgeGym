-- Add is_visitor column to profiles table
-- This flag identifies users as visitors (trial users who haven't become full members)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_visitor BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN profiles.is_visitor IS 'Whether the user is a visitor (trial user not yet converted to full member)';
