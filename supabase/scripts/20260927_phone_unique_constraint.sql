-- Add unique constraint on phone column to prevent duplicates at database level
-- Run this in Supabase SQL Editor
-- Safe to re-run (uses IF NOT EXISTS for index)

-- Create unique index on phone (only for non-null values)
-- This allows multiple NULL phone numbers but prevents duplicate non-null phone numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique 
ON public.profiles (phone) 
WHERE phone IS NOT NULL;

-- Optional: Add comment for documentation
COMMENT ON INDEX public.idx_profiles_phone_unique IS 'Ensures phone numbers are unique across all user profiles (allows NULL)';