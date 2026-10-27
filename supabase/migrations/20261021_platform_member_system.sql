-- Add platform member system
-- This allows members to register without a gym and be approved by super admin
-- Super admin sets a single platform price for all platform members

-- Add member type enum to distinguish between gym members and platform members
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_member';

-- Add member_type column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS member_type text DEFAULT 'gym_member' CHECK (member_type IN ('gym_member', 'platform_member'));

-- Add platform member approval status
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS platform_member_status text DEFAULT 'pending' CHECK (platform_member_status IN ('pending', 'approved', 'rejected'));

-- Add platform member approval timestamps
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS platform_member_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS platform_member_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS platform_member_approved_by uuid,
ADD COLUMN IF NOT EXISTS platform_member_rejected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS platform_member_rejection_reason text;

-- Add platform monthly fee for platform members
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS platform_monthly_fee_paid text;

-- Add comments
COMMENT ON COLUMN public.profiles.member_type IS 'Type of member: gym_member (tied to specific gym) or platform_member (access to all gyms via platform fee)';
COMMENT ON COLUMN public.profiles.platform_member_status IS 'Approval status for platform members: pending, approved, or rejected';
COMMENT ON COLUMN public.profiles.platform_member_requested_at IS 'Timestamp when user requested platform membership';
COMMENT ON COLUMN public.profiles.platform_member_approved_at IS 'Timestamp when super admin approved platform membership';
COMMENT ON COLUMN public.profiles.platform_member_approved_by IS 'Super admin user_id who approved the platform membership';
COMMENT ON COLUMN public.profiles.platform_member_rejected_at IS 'Timestamp when super admin rejected platform membership';
COMMENT ON COLUMN public.profiles.platform_member_rejection_reason IS 'Reason for rejecting platform membership request';
COMMENT ON COLUMN public.profiles.platform_monthly_fee_paid IS 'Amount paid for platform monthly membership (for platform members)';

-- Create platform_settings table if not exists (already exists, but we'll add default platform fee)
INSERT INTO public.platform_settings (key, value, updated_at)
VALUES ('platform_monthly_fee', '50', now())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

-- Add AI Speed feature flag
INSERT INTO public.platform_settings (key, value, updated_at)
VALUES ('ai_speed_enabled', 'true', now())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();

COMMENT ON TABLE public.platform_settings IS 'Platform-wide settings managed by super admin';
COMMENT ON COLUMN public.platform_settings.key IS 'Setting key (e.g., platform_monthly_fee, ai_speed_enabled)';
COMMENT ON COLUMN public.platform_settings.value IS 'Setting value';
