-- Schema baseline for the gym-journey-hub database.
-- Generated on 2026-10-09 from the live Supabase project
-- (ref in supabase/.temp/project-ref) using scripts/.baseline/sec*.sql via
-- "supabase db query --linked". Re-run those queries and this assembler to refresh.
--
-- This is the initial migration: it recreates the full public-schema DDL,
-- storage policies/buckets, grants, and realtime publication membership on a
-- fresh Supabase project. Later incremental migrations in this directory
-- apply on top and are written to be idempotent.
--
-- Applied AFTER this on a fresh project (all idempotent):
--   20261001_gym_operating_days_specific.sql
--   20261001110254_gym_opening_closing_times.sql
--   20261008_add_is_visitor.sql
--   20261009_add_account_freeze.sql
--   20261009_add_freeze_reason.sql
--   20261009_security_revoke_anon_rpc_grants.sql
--   20261009_security_storage_rls_superadmin_email.sql

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------

CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'trainer', 'staff');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.admin_notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  recipient_user_id uuid NOT NULL,
  type text DEFAULT 'admin_approval_request'::text NOT NULL,
  from_user_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.attendance_checkins (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  gym_owner_id uuid NOT NULL,
  user_id uuid NOT NULL,
  checked_in_at timestamp with time zone DEFAULT now() NOT NULL,
  source text DEFAULT 'manual'::text NOT NULL,
  notes text,
  checked_out_at timestamp with time zone,
  slot text DEFAULT 'morning'::text NOT NULL,
  gender text,
  role text,
  full_name text,
  created_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.attendance_checkins IS 'Gym visit check-in/out. Female: morning/afternoon/evening; Male: morning/evening only.';
COMMENT ON COLUMN public.attendance_checkins.checked_out_at IS 'Set when the person checks out; null means still in gym';
COMMENT ON COLUMN public.attendance_checkins.slot IS 'Time slot at check-in: morning | afternoon | evening';

CREATE TABLE public.bmi_records (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  bmi numeric(5,2) NOT NULL,
  weight numeric(10,2) NOT NULL,
  height numeric(10,2) NOT NULL,
  weight_unit character varying(10) NOT NULL,
  height_unit character varying(10) NOT NULL,
  category character varying(50) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
COMMENT ON TABLE public.bmi_records IS 'Stores BMI calculation history for users';
COMMENT ON COLUMN public.bmi_records.bmi IS 'Calculated Body Mass Index';
COMMENT ON COLUMN public.bmi_records.weight IS 'Weight in the specified unit';
COMMENT ON COLUMN public.bmi_records.height IS 'Height in the specified unit';
COMMENT ON COLUMN public.bmi_records.weight_unit IS 'Unit of weight: kg, g, or lbs';
COMMENT ON COLUMN public.bmi_records.height_unit IS 'Unit of height: cm or ft_in';
COMMENT ON COLUMN public.bmi_records.category IS 'BMI category: Underweight, Healthy Weight, Overweight, or Obesity';

CREATE TABLE public.class_bookings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'booked'::text NOT NULL,
  booked_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.class_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  class_id uuid NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  capacity_override integer,
  status text DEFAULT 'scheduled'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.contact_messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'new'::text NOT NULL,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  recipient_type text DEFAULT 'superadmin'::text NOT NULL,
  recipient_user_id uuid,
  recipient_label text
);
COMMENT ON TABLE public.contact_messages IS 'Inbound contact form submissions from the public /contact page';
COMMENT ON COLUMN public.contact_messages.recipient_type IS 'Who the contact form message is addressed to: superadmin or gym_admin';
COMMENT ON COLUMN public.contact_messages.recipient_user_id IS 'Gym owner user_id when recipient_type = gym_admin';
COMMENT ON COLUMN public.contact_messages.recipient_label IS 'Display label captured at submit time (e.g. gym name)';

CREATE TABLE public.gym_classes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  gym_owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  duration_minutes integer DEFAULT 60 NOT NULL,
  capacity integer DEFAULT 20 NOT NULL,
  trainer_user_id uuid,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.gym_reviews (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  gym_owner_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL,
  body text,
  is_published boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.gyms (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_user_id uuid NOT NULL,
  name text NOT NULL,
  gym_type text,
  city text,
  facilities text[] DEFAULT '{}'::text[],
  services text[] DEFAULT '{}'::text[],
  peak_hours text,
  member_capacity text,
  years_operating text,
  operating_days integer,
  bio text,
  avatar_url text,
  owner_display_name text,
  is_published boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  main_image_url text,
  optional_images_urls text[],
  video_url text,
  video_file_url text,
  monthly_fee text,
  trainer_fee text,
  latitude double precision,
  longitude double precision,
  opening_time text,
  closing_time text,
  operating_days_specific text[]
);
COMMENT ON COLUMN public.gyms.opening_time IS 'Gym opening time (e.g., "6:00 AM")';
COMMENT ON COLUMN public.gyms.closing_time IS 'Gym closing time (e.g., "10:00 PM")';
COMMENT ON COLUMN public.gyms.operating_days_specific IS 'Array of specific operating days (e.g., ["Mon", "Tue", "Wed", "Thu", "Fri"])';

CREATE TABLE public.newsletter_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  email text NOT NULL,
  subscribed_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  unsubscribed_at timestamp with time zone,
  unsubscribe_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deletion_scheduled_at timestamp with time zone
);

CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  unread boolean DEFAULT true,
  dismissed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.personal_records (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  exercise_name text NOT NULL,
  value text NOT NULL,
  unit text DEFAULT 'lbs'::text NOT NULL,
  improvement text,
  achieved_at date DEFAULT CURRENT_DATE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.platform_promotions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  cta_label text,
  cta_href text,
  image_url text,
  is_published boolean DEFAULT false NOT NULL,
  show_on_home boolean DEFAULT true NOT NULL,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  email_sent_at timestamp with time zone,
  email_recipient_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.platform_settings (
  key text NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid
);

CREATE TABLE public.profiles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  updated_at timestamp with time zone,
  username text,
  full_name text,
  avatar_url text,
  website text,
  role text,
  phone text,
  gym_name text,
  is_approved boolean DEFAULT true,
  approved_by uuid,
  approved_at timestamp with time zone,
  user_id uuid,
  membership_type text DEFAULT 'basic'::text,
  membership_status text DEFAULT 'active'::text,
  join_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  date_of_birth date,
  gender text,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  activity_level text,
  fitness_goal text,
  experience_level text,
  target_areas text[],
  workout_days_per_week integer,
  workout_duration text,
  workout_type text,
  preferred_workout_time text,
  address text,
  emergency_contact text,
  bio text,
  gym_type text,
  gym_city text,
  gym_years_operating text,
  gym_facilities text[],
  gym_operating_days integer,
  gym_peak_hours text,
  gym_member_capacity text,
  gym_services text[],
  email text,
  is_verified boolean DEFAULT false,
  admin_approved boolean DEFAULT true NOT NULL,
  approval_requested_at timestamp with time zone,
  admin_rejected_at timestamp with time zone,
  is_super_admin boolean DEFAULT false NOT NULL,
  specialization text,
  certifications text[] DEFAULT '{}'::text[],
  certification_number text,
  years_experience text,
  education text,
  skills text[] DEFAULT '{}'::text[],
  languages text[] DEFAULT '{}'::text[],
  trainer_bio text,
  employment_type text,
  branch_department text,
  salary text,
  commission_percentage numeric,
  working_days text,
  working_hours text,
  max_client_capacity text,
  assigned_members text[] DEFAULT '{}'::text[],
  availability text,
  pt_sessions text,
  leave_info text,
  system_permissions text[] DEFAULT '{}'::text[],
  account_status text DEFAULT 'active'::text,
  gym_owner_id uuid,
  staff_type text,
  department text,
  supervisor text,
  shift text,
  overtime_rate text,
  responsibilities text,
  login_enabled boolean DEFAULT true,
  gym_main_image_url text,
  gym_optional_images_urls text[],
  gym_video_url text,
  gym_video_file_url text,
  gym_monthly_fee text,
  gym_trainer_fee text,
  preferred_trainer_id uuid,
  gym_latitude double precision,
  gym_longitude double precision,
  trial_starts_at timestamp with time zone,
  trial_ends_at timestamp with time zone,
  trial_offered boolean DEFAULT false NOT NULL,
  instagram_url text,
  facebook_url text,
  twitter_url text,
  youtube_url text,
  tiktok_url text,
  pending_trainer_id uuid,
  trainer_request_pending boolean DEFAULT false NOT NULL,
  fee_concession text,
  bmi numeric,
  platform_monthly_fee text,
  welcome_modal_shown boolean DEFAULT false,
  feature_classes_enabled boolean DEFAULT false,
  feature_schedule_enabled boolean DEFAULT false,
  feature_membership_enabled boolean DEFAULT false,
  gym_opening_time text,
  gym_closing_time text,
  gym_operating_days_specific text[],
  is_frozen boolean DEFAULT false,
  frozen_until timestamp with time zone,
  is_visitor boolean DEFAULT false,
  freeze_reason text
);
COMMENT ON COLUMN public.profiles.trial_starts_at IS 'Set when superadmin approves the gym owner — trial clock starts';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'trial_starts_at + 1 month';
COMMENT ON COLUMN public.profiles.trial_offered IS 'True for gym owners who signed up with the 1-month free trial offer';
COMMENT ON COLUMN public.profiles.instagram_url IS 'Optional public Instagram profile URL';
COMMENT ON COLUMN public.profiles.facebook_url IS 'Optional public Facebook profile URL';
COMMENT ON COLUMN public.profiles.twitter_url IS 'Optional public X/Twitter profile URL';
COMMENT ON COLUMN public.profiles.youtube_url IS 'Optional public YouTube channel/profile URL';
COMMENT ON COLUMN public.profiles.tiktok_url IS 'Optional public TikTok profile URL';
COMMENT ON COLUMN public.profiles.pending_trainer_id IS 'Requested trainer while trainer_request_pending; null means request to remove trainer';
COMMENT ON COLUMN public.profiles.trainer_request_pending IS 'True when member requested a trainer add/change/remove awaiting gym admin approval';
COMMENT ON COLUMN public.profiles.fee_concession IS 'Optional admin override for this member''s total monthly fee (replaces gym+trainer formula when set)';
COMMENT ON COLUMN public.profiles.bmi IS 'Body mass index computed from weight_kg and height_cm; refreshed when those change';
COMMENT ON COLUMN public.profiles.platform_monthly_fee IS 'Monthly platform fee for this gym owner, set by super admin. Falls back to global platform_facility_fee when null.';
COMMENT ON COLUMN public.profiles.welcome_modal_shown IS 'Tracks if admin has seen the welcome modal after approval';
COMMENT ON COLUMN public.profiles.feature_classes_enabled IS 'When true, Classes appears in the dashboard sidebar for this gym';
COMMENT ON COLUMN public.profiles.feature_schedule_enabled IS 'When true, Schedule appears in the dashboard sidebar for this gym';
COMMENT ON COLUMN public.profiles.feature_membership_enabled IS 'When true, Membership appears in the dashboard sidebar for this gym';
COMMENT ON COLUMN public.profiles.gym_opening_time IS 'Gym opening time from profile (fallback for gyms table)';
COMMENT ON COLUMN public.profiles.gym_closing_time IS 'Gym closing time from profile (fallback for gyms table)';
COMMENT ON COLUMN public.profiles.gym_operating_days_specific IS 'Array of specific operating days from profile (fallback for gyms table)';
COMMENT ON COLUMN public.profiles.is_frozen IS 'Whether the user account is frozen (cannot sign in)';
COMMENT ON COLUMN public.profiles.frozen_until IS 'Optional timestamp for automatic unfreeze (null = manual unfreeze only)';
COMMENT ON COLUMN public.profiles.is_visitor IS 'Whether the user is a visitor (trial user not yet converted to full member)';
COMMENT ON COLUMN public.profiles.freeze_reason IS 'Reason for account freeze: manual (admin action) or trial_expiration (trial timer expired)';

CREATE TABLE public.promotion_email_log (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  promotion_id uuid NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL,
  provider text DEFAULT 'brevo'::text,
  error_message text,
  sent_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.public_traffic (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ip_address text NOT NULL,
  path text DEFAULT '/'::text NOT NULL,
  referrer text,
  user_agent text,
  visited_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.reviews (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  gym_owner_id uuid,
  reviewer_name text NOT NULL,
  reviewer_role text NOT NULL,
  rating integer NOT NULL,
  review_text text NOT NULL,
  review_type text DEFAULT 'general'::text NOT NULL,
  is_approved boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);
COMMENT ON TABLE public.reviews IS 'Platform feedback from customers, gym owners (admin), and trainers — approved rows power homepage testimonials';
COMMENT ON COLUMN public.reviews.user_id IS 'The user who submitted the review';
COMMENT ON COLUMN public.reviews.gym_owner_id IS 'The gym owner being reviewed (null for platform reviews)';
COMMENT ON COLUMN public.reviews.reviewer_name IS 'Name of the person submitting the review';
COMMENT ON COLUMN public.reviews.reviewer_role IS 'Role of reviewer: customer, admin, or trainer';
COMMENT ON COLUMN public.reviews.rating IS 'Star rating from 1 to 5';
COMMENT ON COLUMN public.reviews.review_text IS 'The actual review/feedback text';
COMMENT ON COLUMN public.reviews.review_type IS 'Type of review: general, service, facilities, trainer, staff';
COMMENT ON COLUMN public.reviews.is_approved IS 'Whether the review has been approved by admin';
COMMENT ON COLUMN public.reviews.is_featured IS 'Whether the review should be featured prominently';

CREATE TABLE public.user_roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role app_role DEFAULT 'user'::app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.workout_days (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  day_date date NOT NULL,
  focus text DEFAULT ''::text NOT NULL,
  notes text,
  duration_minutes integer,
  calories integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.workout_exercises (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  workout_day_id uuid NOT NULL,
  user_id uuid NOT NULL,
  exercise_name text NOT NULL,
  sets integer DEFAULT 3 NOT NULL,
  reps integer DEFAULT 10 NOT NULL,
  weight text,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_deletion_scheduled(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.newsletter_subscriptions
  SET deletion_scheduled_at = NULL
  WHERE email = p_email;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Deletion schedule cancelled'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_newsletter_subscription(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_is_subscribed BOOLEAN DEFAULT false;
  v_is_active BOOLEAN DEFAULT false;
BEGIN
  -- Check if email exists in subscriptions
  SELECT true, is_active INTO v_is_subscribed, v_is_active
  FROM public.newsletter_subscriptions
  WHERE email = p_email
  LIMIT 1;

  RETURN jsonb_build_object(
    'is_subscribed', v_is_subscribed,
    'is_active', v_is_active
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_user_exists(check_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF check_email IS NULL OR trim(check_email) = '' THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(check_email)))
      OR EXISTS (SELECT 1 FROM public.profiles WHERE email IS NOT NULL AND lower(email) = lower(trim(check_email)));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_user_verified(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_verified BOOLEAN := false;
BEGIN
  IF user_email IS NULL OR trim(user_email) = '' THEN
    RETURN false;
  END IF;

  SELECT COALESCE(is_verified, false) INTO v_verified
  FROM public.profiles
  WHERE lower(email) = lower(trim(user_email));

  RETURN COALESCE(v_verified, false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_subscriptions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete subscriptions where deletion_scheduled_at has passed
  DELETE FROM public.newsletter_subscriptions
  WHERE deletion_scheduled_at IS NOT NULL 
  AND deletion_scheduled_at <= NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_metadata)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_roles()
 RETURNS TABLE(role app_role)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = auth.uid();
$function$
;

CREATE OR REPLACE FUNCTION public.get_newsletter_subscriptions()
 RETURNS SETOF newsletter_subscriptions
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY SELECT * FROM public.newsletter_subscriptions ORDER BY subscribed_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  user_role text := coalesce(new.raw_user_meta_data->>'role', 'customer');
begin
  if old.email_confirmed_at is null
     and new.email_confirmed_at is not null
     and user_role = 'customer' then
    update public.profiles
    set
      is_approved = true,
      approved_by = coalesce(approved_by, new.id),
      approved_at = coalesce(approved_at, now()),
      updated_at = now()
    where id = new.id;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_target_areas text[];
  v_gym_facilities text[];
  v_gym_services text[];
  v_gym_optional_images_urls text[];
  v_role public.app_role;
  v_admin_approved boolean;
  v_gym_owner_id uuid;
  v_membership_status text;
BEGIN
  BEGIN
    IF NEW.raw_user_meta_data ? 'target_areas'
       AND jsonb_typeof(NEW.raw_user_meta_data -> 'target_areas') = 'array'
    THEN
      SELECT array_agg(elem::text)
      INTO v_target_areas
      FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'target_areas') AS elem;
    END IF;

    IF NEW.raw_user_meta_data ? 'gym_facilities'
       AND jsonb_typeof(NEW.raw_user_meta_data -> 'gym_facilities') = 'array'
    THEN
      SELECT array_agg(elem::text)
      INTO v_gym_facilities
      FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'gym_facilities') AS elem;
    END IF;

    IF NEW.raw_user_meta_data ? 'gym_services'
       AND jsonb_typeof(NEW.raw_user_meta_data -> 'gym_services') = 'array'
    THEN
      SELECT array_agg(elem::text)
      INTO v_gym_services
      FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'gym_services') AS elem;
    END IF;

    IF NEW.raw_user_meta_data ? 'gym_optional_images_urls'
       AND jsonb_typeof(NEW.raw_user_meta_data -> 'gym_optional_images_urls') = 'array'
    THEN
      SELECT array_agg(elem::text)
      INTO v_gym_optional_images_urls
      FROM jsonb_array_elements_text(NEW.raw_user_meta_data -> 'gym_optional_images_urls') AS elem;
    END IF;

    BEGIN
      IF NEW.raw_user_meta_data ? 'gym_owner_id'
         AND NULLIF(trim(NEW.raw_user_meta_data ->> 'gym_owner_id'), '') IS NOT NULL
      THEN
        v_gym_owner_id := (NEW.raw_user_meta_data ->> 'gym_owner_id')::uuid;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_gym_owner_id := NULL;
    END;

    IF lower(COALESCE(NEW.raw_user_meta_data ->> 'requested_role', 'user')) = 'admin' THEN
      v_role := 'admin'::public.app_role;
      v_admin_approved := false;
      v_gym_owner_id := NEW.id;
      v_membership_status := 'pending';
    ELSIF v_gym_owner_id IS NOT NULL THEN
      -- Customer joining a gym: pending until gym admin approves
      v_role := 'user'::public.app_role;
      v_admin_approved := false;
      v_membership_status := 'pending';
    ELSE
      v_role := 'user'::public.app_role;
      v_admin_approved := true;
      v_membership_status := 'active';
    END IF;

    INSERT INTO public.profiles (
      id,
      user_id,
      email,
      full_name,
      phone,
      address,
      emergency_contact,
      date_of_birth,
      gender,
      weight_kg,
      height_cm,
      activity_level,
      fitness_goal,
      experience_level,
      target_areas,
      workout_days_per_week,
      workout_duration,
      workout_type,
      preferred_workout_time,
      admin_approved,
      membership_status,
      membership_type,
      gym_owner_id,
      gym_name,
      gym_type,
      gym_city,
      gym_years_operating,
      gym_facilities,
      gym_operating_days,
      gym_peak_hours,
      gym_member_capacity,
      gym_services,
      gym_main_image_url,
      gym_optional_images_urls,
      gym_video_url,
      gym_video_file_url
    )
    VALUES (
      NEW.id,
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data ->> 'phone',
      NEW.raw_user_meta_data ->> 'address',
      NEW.raw_user_meta_data ->> 'emergency_contact',
      NULLIF(NEW.raw_user_meta_data ->> 'date_of_birth', '')::date,
      NEW.raw_user_meta_data ->> 'gender',
      NULLIF(NEW.raw_user_meta_data ->> 'weight_kg', '')::numeric,
      NULLIF(NEW.raw_user_meta_data ->> 'height_cm', '')::numeric,
      NEW.raw_user_meta_data ->> 'activity_level',
      NEW.raw_user_meta_data ->> 'fitness_goal',
      NEW.raw_user_meta_data ->> 'experience_level',
      v_target_areas,
      NULLIF(NEW.raw_user_meta_data ->> 'workout_days_per_week', '')::integer,
      NEW.raw_user_meta_data ->> 'workout_duration',
      NEW.raw_user_meta_data ->> 'workout_type',
      NEW.raw_user_meta_data ->> 'preferred_workout_time',
      v_admin_approved,
      v_membership_status,
      'basic',
      v_gym_owner_id,
      NEW.raw_user_meta_data ->> 'gym_name',
      NEW.raw_user_meta_data ->> 'gym_type',
      NEW.raw_user_meta_data ->> 'gym_city',
      NEW.raw_user_meta_data ->> 'gym_years_operating',
      v_gym_facilities,
      NULLIF(NEW.raw_user_meta_data ->> 'gym_operating_days', '')::integer,
      NEW.raw_user_meta_data ->> 'gym_peak_hours',
      NEW.raw_user_meta_data ->> 'gym_member_capacity',
      v_gym_services,
      NEW.raw_user_meta_data ->> 'gym_main_image_url',
      v_gym_optional_images_urls,
      NEW.raw_user_meta_data ->> 'gym_video_url',
      NEW.raw_user_meta_data ->> 'gym_video_file_url'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      phone                 = COALESCE(EXCLUDED.phone,                 profiles.phone),
      address               = COALESCE(EXCLUDED.address,               profiles.address),
      emergency_contact     = COALESCE(EXCLUDED.emergency_contact,     profiles.emergency_contact),
      date_of_birth         = COALESCE(EXCLUDED.date_of_birth,         profiles.date_of_birth),
      gender                = COALESCE(EXCLUDED.gender,                profiles.gender),
      weight_kg             = COALESCE(EXCLUDED.weight_kg,             profiles.weight_kg),
      height_cm             = COALESCE(EXCLUDED.height_cm,             profiles.height_cm),
      activity_level        = COALESCE(EXCLUDED.activity_level,        profiles.activity_level),
      fitness_goal          = COALESCE(EXCLUDED.fitness_goal,          profiles.fitness_goal),
      experience_level      = COALESCE(EXCLUDED.experience_level,      profiles.experience_level),
      target_areas          = COALESCE(EXCLUDED.target_areas,          profiles.target_areas),
      workout_days_per_week = COALESCE(EXCLUDED.workout_days_per_week, profiles.workout_days_per_week),
      workout_duration      = COALESCE(EXCLUDED.workout_duration,      profiles.workout_duration),
      workout_type          = COALESCE(EXCLUDED.workout_type,          profiles.workout_type),
      preferred_workout_time= COALESCE(EXCLUDED.preferred_workout_time,profiles.preferred_workout_time),
      admin_approved        = COALESCE(EXCLUDED.admin_approved,        profiles.admin_approved),
      membership_status     = COALESCE(EXCLUDED.membership_status,     profiles.membership_status),
      gym_owner_id          = COALESCE(EXCLUDED.gym_owner_id,          profiles.gym_owner_id),
      gym_name              = COALESCE(EXCLUDED.gym_name,              profiles.gym_name),
      gym_type              = COALESCE(EXCLUDED.gym_type,              profiles.gym_type),
      gym_city              = COALESCE(EXCLUDED.gym_city,              profiles.gym_city),
      gym_years_operating   = COALESCE(EXCLUDED.gym_years_operating,   profiles.gym_years_operating),
      gym_facilities        = COALESCE(EXCLUDED.gym_facilities,        profiles.gym_facilities),
      gym_operating_days    = COALESCE(EXCLUDED.gym_operating_days,    profiles.gym_operating_days),
      gym_peak_hours        = COALESCE(EXCLUDED.gym_peak_hours,        profiles.gym_peak_hours),
      gym_member_capacity   = COALESCE(EXCLUDED.gym_member_capacity,   profiles.gym_member_capacity),
      gym_services          = COALESCE(EXCLUDED.gym_services,          profiles.gym_services),
      gym_main_image_url    = COALESCE(EXCLUDED.gym_main_image_url,    profiles.gym_main_image_url),
      gym_optional_images_urls = COALESCE(EXCLUDED.gym_optional_images_urls, profiles.gym_optional_images_urls),
      gym_video_url         = COALESCE(EXCLUDED.gym_video_url,         profiles.gym_video_url),
      gym_video_file_url    = COALESCE(EXCLUDED.gym_video_file_url,    profiles.gym_video_file_url),
      updated_at            = now();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user profile insert failed: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user role insert failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean := false;
  v_name text;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
  THEN
    UPDATE public.profiles
    SET is_verified = true, updated_at = now()
    WHERE user_id = NEW.id;

    SELECT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin'
    ) INTO v_is_admin;

    IF v_is_admin THEN
      UPDATE public.profiles
      SET approval_requested_at = COALESCE(approval_requested_at, now()), updated_at = now()
      WHERE user_id = NEW.id AND COALESCE(admin_approved, false) = false;

      SELECT COALESCE(full_name, NEW.email) INTO v_name
      FROM public.profiles WHERE user_id = NEW.id;

      PERFORM public.notify_approved_admins(
        NEW.id,
        'Admin email verified — approve login',
        COALESCE(v_name, NEW.email) || ' verified their email and is waiting for approval.'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE user_id = _user_id LIMIT 1),
    false
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND lower(email) = 'superadmin@forge.test'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.my_gym_owner_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin') THEN auth.uid()
    ELSE (
      SELECT gym_owner_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
    )
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_approved_admins(p_from_user_id uuid, p_title text, p_message text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.user_id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'admin'
    WHERE COALESCE(p.admin_approved, false) = true
      AND (p_from_user_id IS NULL OR p.user_id <> p_from_user_id)
  LOOP
    INSERT INTO public.admin_notifications (
      recipient_user_id, type, from_user_id, title, message
    ) VALUES (
      r.user_id, 'admin_approval_request', p_from_user_id, p_title, p_message
    );
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.profiles_block_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Service role / trigger contexts often have null auth.uid()
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Non-owners cannot change another row here (RLS also enforces)
  IF NEW.user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not allowed to update this profile';
  END IF;

  -- Self-service: freeze privileged columns
  IF NEW.user_id = auth.uid() AND NOT public.is_super_admin(auth.uid()) THEN
    NEW.is_super_admin := OLD.is_super_admin;
    NEW.admin_approved := OLD.admin_approved;
    NEW.admin_rejected_at := OLD.admin_rejected_at;
    NEW.approval_requested_at := OLD.approval_requested_at;
    NEW.is_verified := OLD.is_verified;
    NEW.login_enabled := OLD.login_enabled;
    NEW.gym_owner_id := OLD.gym_owner_id;
    NEW.membership_status := OLD.membership_status;
    NEW.membership_type := OLD.membership_type;
    NEW.system_permissions := OLD.system_permissions;
    NEW.account_status := OLD.account_status;
    NEW.email := OLD.email;
    NEW.user_id := OLD.user_id;
    NEW.id := OLD.id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_newsletter_preference(p_email text, p_subscribe boolean, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_email TEXT := lower(trim(p_email));
  v_id UUID;
BEGIN
  IF p_subscribe THEN
    RETURN public.subscribe_to_newsletter(v_email);
  END IF;

  SELECT id INTO v_id
  FROM public.newsletter_subscriptions
  WHERE email = v_email;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'no_change', true,
      'message', 'Not subscribed'
    );
  END IF;

  UPDATE public.newsletter_subscriptions
  SET
    is_active = false,
    unsubscribed_at = NOW(),
    unsubscribe_reason = COALESCE(p_reason, 'user_preference'),
    deletion_scheduled_at = NULL
  WHERE id = v_id;

  RETURN jsonb_build_object(
    'success', true,
    'unsubscribed', true,
    'message', 'Unsubscribed successfully'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.subscribe_to_newsletter(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_subscription_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.newsletter_subscriptions
    WHERE email = lower(trim(p_email)) AND is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_subscribed', true,
      'no_change', true,
      'message', 'Email is already subscribed'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.newsletter_subscriptions
    WHERE email = lower(trim(p_email)) AND is_active = false
  ) THEN
    UPDATE public.newsletter_subscriptions
    SET
      is_active = true,
      unsubscribed_at = NULL,
      unsubscribe_reason = NULL,
      deletion_scheduled_at = NULL,
      subscribed_at = NOW()
    WHERE email = lower(trim(p_email))
    RETURNING id INTO v_subscription_id;

    RETURN jsonb_build_object(
      'success', true,
      'reactivated', true,
      'subscription_id', v_subscription_id,
      'message', 'Subscription reactivated successfully'
    );
  END IF;

  INSERT INTO public.newsletter_subscriptions (email)
  VALUES (lower(trim(p_email)))
  RETURNING id INTO v_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_subscription', true,
    'subscription_id', v_subscription_id,
    'message', 'Subscribed successfully'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_gym_from_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'admin'
  ) INTO is_admin;

  IF is_admin
     AND COALESCE(NEW.is_super_admin, false) = false
     AND COALESCE(NEW.admin_approved, false) = true
     AND NULLIF(trim(COALESCE(NEW.gym_name, '')), '') IS NOT NULL
  THEN
    INSERT INTO public.gyms AS g (
      owner_user_id, name, gym_type, city, facilities, services,
      peak_hours, member_capacity, years_operating, operating_days,
      bio, avatar_url, owner_display_name, is_published,
      main_image_url, optional_images_urls, video_url, video_file_url,
      monthly_fee, trainer_fee,
      latitude, longitude,
      updated_at
    ) VALUES (
      NEW.user_id, trim(NEW.gym_name), NEW.gym_type, NEW.gym_city,
      COALESCE(NEW.gym_facilities, '{}'), COALESCE(NEW.gym_services, '{}'),
      NEW.gym_peak_hours, NEW.gym_member_capacity, NEW.gym_years_operating,
      NEW.gym_operating_days, NEW.bio, NEW.avatar_url, NEW.full_name,
      true,
      NEW.gym_main_image_url, NEW.gym_optional_images_urls,
      NEW.gym_video_url, NEW.gym_video_file_url,
      NEW.gym_monthly_fee, NEW.gym_trainer_fee,
      NEW.gym_latitude, NEW.gym_longitude,
      now()
    )
    ON CONFLICT (owner_user_id) DO UPDATE SET
      name = EXCLUDED.name,
      gym_type = EXCLUDED.gym_type,
      city = EXCLUDED.city,
      facilities = EXCLUDED.facilities,
      services = EXCLUDED.services,
      peak_hours = EXCLUDED.peak_hours,
      member_capacity = EXCLUDED.member_capacity,
      years_operating = EXCLUDED.years_operating,
      operating_days = EXCLUDED.operating_days,
      bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url,
      owner_display_name = EXCLUDED.owner_display_name,
      is_published = true,
      main_image_url = EXCLUDED.main_image_url,
      optional_images_urls = EXCLUDED.optional_images_urls,
      video_url = EXCLUDED.video_url,
      video_file_url = EXCLUDED.video_file_url,
      monthly_fee = EXCLUDED.monthly_fee,
      trainer_fee = EXCLUDED.trainer_fee,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      updated_at = now();
  ELSE
    UPDATE public.gyms
    SET is_published = false, updated_at = now()
    WHERE owner_user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_my_signup_profile()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_meta jsonb;
  v_email text;
  v_role public.app_role;
  v_admin_approved boolean;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT raw_user_meta_data, email INTO v_meta, v_email
  FROM auth.users WHERE id = v_uid;

  IF lower(COALESCE(v_meta ->> 'requested_role', 'user')) = 'admin' THEN
    v_role := 'admin'::public.app_role;
    v_admin_approved := false;
  ELSE
    v_role := 'user'::public.app_role;
    v_admin_approved := true;
  END IF;

  v_name := COALESCE(v_meta ->> 'full_name', split_part(v_email, '@', 1));

  INSERT INTO public.profiles (
    id, user_id, email, full_name, phone, address, emergency_contact,
    admin_approved, approval_requested_at,
    gym_name, gym_type, gym_city, gym_years_operating,
    gym_operating_days, gym_peak_hours, gym_member_capacity,
    membership_status, membership_type
  ) VALUES (
    v_uid, v_uid, v_email, v_name,
    v_meta ->> 'phone', v_meta ->> 'address', v_meta ->> 'emergency_contact',
    v_admin_approved,
    CASE WHEN v_role = 'admin' THEN now() ELSE NULL END,
    v_meta ->> 'gym_name', v_meta ->> 'gym_type', v_meta ->> 'gym_city',
    v_meta ->> 'gym_years_operating',
    CASE WHEN COALESCE(v_meta ->> 'gym_operating_days', '') <> ''
      THEN (v_meta ->> 'gym_operating_days')::integer ELSE NULL END,
    v_meta ->> 'gym_peak_hours', v_meta ->> 'gym_member_capacity',
    'active', 'basic'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    address = COALESCE(EXCLUDED.address, profiles.address),
    emergency_contact = COALESCE(EXCLUDED.emergency_contact, profiles.emergency_contact),
    admin_approved = EXCLUDED.admin_approved,
    approval_requested_at = COALESCE(profiles.approval_requested_at, EXCLUDED.approval_requested_at),
    gym_name = COALESCE(EXCLUDED.gym_name, profiles.gym_name),
    gym_type = COALESCE(EXCLUDED.gym_type, profiles.gym_type),
    gym_city = COALESCE(EXCLUDED.gym_city, profiles.gym_city),
    gym_years_operating = COALESCE(EXCLUDED.gym_years_operating, profiles.gym_years_operating),
    gym_operating_days = COALESCE(EXCLUDED.gym_operating_days, profiles.gym_operating_days),
    gym_peak_hours = COALESCE(EXCLUDED.gym_peak_hours, profiles.gym_peak_hours),
    gym_member_capacity = COALESCE(EXCLUDED.gym_member_capacity, profiles.gym_member_capacity),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, v_role)
  ON CONFLICT DO NOTHING;

  IF v_role = 'admin' AND NOT EXISTS (
    SELECT 1 FROM public.admin_notifications
    WHERE from_user_id = v_uid AND type = 'admin_approval_request'
  ) THEN
    PERFORM public.notify_approved_admins(
      v_uid,
      'New admin awaiting approval',
      v_name || ' (' || v_email || ') registered as admin/gym owner and needs approval.'
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'role', v_role::text, 'admin_approved', v_admin_approved);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.unsubscribe_from_newsletter(p_email text, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_subscription_id UUID;
BEGIN
  -- Check if email exists and is active
  SELECT id INTO v_subscription_id
  FROM public.newsletter_subscriptions
  WHERE email = p_email AND is_active = true;

  IF v_subscription_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No active subscription found for this email'
    );
  END IF;

  -- Unsubscribe and schedule deletion in 10 minutes
  UPDATE public.newsletter_subscriptions
  SET 
    is_active = false,
    unsubscribed_at = NOW(),
    unsubscribe_reason = p_reason,
    deletion_scheduled_at = NOW() + INTERVAL '10 minutes'
  WHERE id = v_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'deletion_scheduled_at', (SELECT deletion_scheduled_at FROM public.newsletter_subscriptions WHERE id = v_subscription_id),
    'message', 'Unsubscribed successfully. Record will be deleted in 10 minutes.'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_newsletter_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

-- ---------------------------------------------------------------------------
-- Constraints
-- ---------------------------------------------------------------------------

ALTER TABLE public.admin_notifications ADD CONSTRAINT admin_notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.attendance_checkins ADD CONSTRAINT attendance_checkins_pkey PRIMARY KEY (id);
ALTER TABLE public.attendance_checkins ADD CONSTRAINT attendance_checkins_slot_check CHECK ((slot = ANY (ARRAY['morning'::text, 'afternoon'::text, 'evening'::text])));
ALTER TABLE public.attendance_checkins ADD CONSTRAINT attendance_checkins_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'qr'::text, 'kiosk'::text, 'class'::text])));
ALTER TABLE public.bmi_records ADD CONSTRAINT bmi_records_height_unit_check CHECK (((height_unit)::text = ANY ((ARRAY['cm'::character varying, 'ft_in'::character varying])::text[])));
ALTER TABLE public.bmi_records ADD CONSTRAINT bmi_records_pkey PRIMARY KEY (id);
ALTER TABLE public.bmi_records ADD CONSTRAINT bmi_records_weight_unit_check CHECK (((weight_unit)::text = ANY ((ARRAY['kg'::character varying, 'g'::character varying, 'lbs'::character varying])::text[])));
ALTER TABLE public.class_bookings ADD CONSTRAINT class_bookings_pkey PRIMARY KEY (id);
ALTER TABLE public.class_bookings ADD CONSTRAINT class_bookings_session_id_user_id_key UNIQUE (session_id, user_id);
ALTER TABLE public.class_bookings ADD CONSTRAINT class_bookings_status_check CHECK ((status = ANY (ARRAY['booked'::text, 'cancelled'::text, 'waitlisted'::text, 'attended'::text, 'no_show'::text])));
ALTER TABLE public.class_sessions ADD CONSTRAINT class_sessions_pkey PRIMARY KEY (id);
ALTER TABLE public.class_sessions ADD CONSTRAINT class_sessions_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'cancelled'::text, 'completed'::text])));
ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);
ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_recipient_type_check CHECK ((recipient_type = ANY (ARRAY['superadmin'::text, 'gym_admin'::text])));
ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_status_check CHECK ((status = ANY (ARRAY['new'::text, 'read'::text, 'replied'::text, 'archived'::text])));
ALTER TABLE public.gym_classes ADD CONSTRAINT gym_classes_pkey PRIMARY KEY (id);
ALTER TABLE public.gym_reviews ADD CONSTRAINT gym_reviews_gym_owner_id_user_id_key UNIQUE (gym_owner_id, user_id);
ALTER TABLE public.gym_reviews ADD CONSTRAINT gym_reviews_pkey PRIMARY KEY (id);
ALTER TABLE public.gym_reviews ADD CONSTRAINT gym_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
ALTER TABLE public.gyms ADD CONSTRAINT gyms_owner_user_id_key UNIQUE (owner_user_id);
ALTER TABLE public.gyms ADD CONSTRAINT gyms_pkey PRIMARY KEY (id);
ALTER TABLE public.newsletter_subscriptions ADD CONSTRAINT newsletter_subscriptions_email_key UNIQUE (email);
ALTER TABLE public.newsletter_subscriptions ADD CONSTRAINT newsletter_subscriptions_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['confirmation'::text, 'maintenance'::text, 'directive'::text, 'info'::text, 'alert'::text, 'booking'::text, 'payment'::text, 'achievement'::text, 'reminder'::text, 'system'::text, 'welcome'::text, 'membership'::text, 'class_update'::text, 'promotion'::text, 'feedback'::text, 'security'::text])));
ALTER TABLE public.personal_records ADD CONSTRAINT personal_records_pkey PRIMARY KEY (id);
ALTER TABLE public.platform_promotions ADD CONSTRAINT platform_promotions_pkey PRIMARY KEY (id);
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (key);
ALTER TABLE public.profiles ADD CONSTRAINT freeze_reason_check CHECK (((freeze_reason IS NULL) OR (freeze_reason = ANY (ARRAY['manual'::text, 'trial_expiration'::text]))));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['customer'::text, 'admin'::text, 'super_admin'::text])));
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
ALTER TABLE public.profiles ADD CONSTRAINT username_length CHECK ((char_length(username) >= 3));
ALTER TABLE public.promotion_email_log ADD CONSTRAINT promotion_email_log_pkey PRIMARY KEY (id);
ALTER TABLE public.promotion_email_log ADD CONSTRAINT promotion_email_log_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text, 'queued'::text, 'skipped'::text])));
ALTER TABLE public.public_traffic ADD CONSTRAINT public_traffic_pkey PRIMARY KEY (id);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);
ALTER TABLE public.reviews ADD CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)));
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.workout_days ADD CONSTRAINT workout_days_pkey PRIMARY KEY (id);
ALTER TABLE public.workout_days ADD CONSTRAINT workout_days_user_id_day_date_key UNIQUE (user_id, day_date);
ALTER TABLE public.workout_exercises ADD CONSTRAINT workout_exercises_pkey PRIMARY KEY (id);
ALTER TABLE public.workout_exercises ADD CONSTRAINT workout_exercises_reps_check CHECK (((reps > 0) AND (reps <= 500)));
ALTER TABLE public.workout_exercises ADD CONSTRAINT workout_exercises_sets_check CHECK (((sets > 0) AND (sets <= 50)));
ALTER TABLE public.admin_notifications ADD CONSTRAINT admin_notifications_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.admin_notifications ADD CONSTRAINT admin_notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_checkins ADD CONSTRAINT attendance_checkins_gym_owner_id_fkey FOREIGN KEY (gym_owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_checkins ADD CONSTRAINT attendance_checkins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bmi_records ADD CONSTRAINT bmi_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.class_bookings ADD CONSTRAINT class_bookings_session_id_fkey FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.class_bookings ADD CONSTRAINT class_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.class_sessions ADD CONSTRAINT class_sessions_class_id_fkey FOREIGN KEY (class_id) REFERENCES gym_classes(id) ON DELETE CASCADE;
ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.gym_classes ADD CONSTRAINT gym_classes_gym_owner_id_fkey FOREIGN KEY (gym_owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.gym_classes ADD CONSTRAINT gym_classes_trainer_user_id_fkey FOREIGN KEY (trainer_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.gym_reviews ADD CONSTRAINT gym_reviews_gym_owner_id_fkey FOREIGN KEY (gym_owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.gym_reviews ADD CONSTRAINT gym_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.gyms ADD CONSTRAINT gyms_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.personal_records ADD CONSTRAINT personal_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.platform_promotions ADD CONSTRAINT platform_promotions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.platform_settings ADD CONSTRAINT platform_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pending_trainer_id_fkey FOREIGN KEY (pending_trainer_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_preferred_trainer_id_fkey FOREIGN KEY (preferred_trainer_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.promotion_email_log ADD CONSTRAINT promotion_email_log_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES platform_promotions(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_gym_owner_id_fkey FOREIGN KEY (gym_owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.workout_days ADD CONSTRAINT workout_days_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.workout_exercises ADD CONSTRAINT workout_exercises_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.workout_exercises ADD CONSTRAINT workout_exercises_workout_day_id_fkey FOREIGN KEY (workout_day_id) REFERENCES workout_days(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX gyms_coords_idx ON public.gyms USING btree (latitude, longitude) WHERE ((latitude IS NOT NULL) AND (longitude IS NOT NULL));
CREATE INDEX gyms_published_name_idx ON public.gyms USING btree (name) WHERE (is_published = true);
CREATE INDEX idx_attendance_gym_checked_in ON public.attendance_checkins USING btree (gym_owner_id, checked_in_at DESC);
CREATE INDEX idx_attendance_gym_day ON public.attendance_checkins USING btree (gym_owner_id, checked_in_at DESC);
CREATE INDEX idx_attendance_open_session ON public.attendance_checkins USING btree (user_id, gym_owner_id) WHERE (checked_out_at IS NULL);
CREATE INDEX idx_attendance_user ON public.attendance_checkins USING btree (user_id, checked_in_at DESC);
CREATE INDEX idx_attendance_user_checked_in ON public.attendance_checkins USING btree (user_id, checked_in_at DESC);
CREATE INDEX idx_bmi_records_created_at ON public.bmi_records USING btree (created_at DESC);
CREATE INDEX idx_bmi_records_user_id ON public.bmi_records USING btree (user_id);
CREATE INDEX idx_class_bookings_user ON public.class_bookings USING btree (user_id);
CREATE INDEX idx_class_sessions_starts ON public.class_sessions USING btree (starts_at);
CREATE INDEX idx_contact_messages_created ON public.contact_messages USING btree (created_at DESC);
CREATE INDEX idx_contact_messages_recipient ON public.contact_messages USING btree (recipient_type, recipient_user_id, created_at DESC);
CREATE INDEX idx_contact_messages_status ON public.contact_messages USING btree (status, created_at DESC);
CREATE INDEX idx_gym_classes_owner ON public.gym_classes USING btree (gym_owner_id);
CREATE INDEX idx_gym_reviews_owner ON public.gym_reviews USING btree (gym_owner_id, created_at DESC);
CREATE INDEX idx_newsletter_subscriptions_email ON public.newsletter_subscriptions USING btree (email);
CREATE INDEX idx_newsletter_subscriptions_is_active ON public.newsletter_subscriptions USING btree (is_active);
CREATE INDEX idx_newsletter_subscriptions_subscribed_at ON public.newsletter_subscriptions USING btree (subscribed_at DESC);
CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, unread);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_platform_promotions_published ON public.platform_promotions USING btree (is_published, show_on_home, created_at DESC);
CREATE UNIQUE INDEX idx_profiles_phone_unique ON public.profiles USING btree (phone) WHERE (phone IS NOT NULL);
CREATE INDEX idx_profiles_trainer_request_pending ON public.profiles USING btree (gym_owner_id) WHERE (trainer_request_pending = true);
CREATE INDEX idx_profiles_trial_ends ON public.profiles USING btree (trial_ends_at) WHERE ((trial_ends_at IS NOT NULL) AND (is_super_admin IS DISTINCT FROM true));
CREATE INDEX idx_promotion_email_log_promo ON public.promotion_email_log USING btree (promotion_id, sent_at DESC);
CREATE INDEX idx_reviews_approved ON public.reviews USING btree (is_approved, created_at DESC);
CREATE INDEX idx_reviews_featured ON public.reviews USING btree (is_featured, created_at DESC);
CREATE INDEX idx_reviews_gym_owner_id ON public.reviews USING btree (gym_owner_id);
CREATE INDEX idx_reviews_rating ON public.reviews USING btree (rating DESC, created_at DESC);
CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);
CREATE INDEX personal_records_user_idx ON public.personal_records USING btree (user_id, achieved_at DESC);
CREATE INDEX profiles_admin_approved_idx ON public.profiles USING btree (admin_approved) WHERE (admin_approved IS NOT TRUE);
CREATE INDEX profiles_approval_requested_at_idx ON public.profiles USING btree (approval_requested_at DESC NULLS LAST);
CREATE INDEX profiles_email_idx ON public.profiles USING btree (lower(email));
CREATE INDEX profiles_gym_owner_approval_idx ON public.profiles USING btree (gym_owner_id, admin_approved);
CREATE INDEX profiles_gym_owner_id_idx ON public.profiles USING btree (gym_owner_id);
CREATE INDEX profiles_is_super_admin_idx ON public.profiles USING btree (is_super_admin) WHERE (is_super_admin = true);
CREATE INDEX profiles_preferred_trainer_id_idx ON public.profiles USING btree (preferred_trainer_id) WHERE (preferred_trainer_id IS NOT NULL);
CREATE INDEX user_roles_role_idx ON public.user_roles USING btree (role);
CREATE INDEX workout_days_user_date_idx ON public.workout_days USING btree (user_id, day_date DESC);
CREATE INDEX workout_exercises_day_idx ON public.workout_exercises USING btree (workout_day_id, sort_order);
CREATE INDEX workout_exercises_user_idx ON public.workout_exercises USING btree (user_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER update_bmi_records_updated_at BEFORE UPDATE ON public.bmi_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_newsletter_updated_at BEFORE UPDATE ON public.newsletter_subscriptions FOR EACH ROW EXECUTE FUNCTION update_newsletter_updated_at();
CREATE TRIGGER set_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_personal_records_updated_at BEFORE UPDATE ON public.personal_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER profiles_block_privilege_escalation BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION profiles_block_privilege_escalation();
CREATE TRIGGER profiles_sync_gym AFTER INSERT OR UPDATE OF gym_name, gym_type, gym_city, gym_facilities, gym_services, gym_peak_hours, gym_member_capacity, gym_years_operating, gym_operating_days, bio, avatar_url, full_name, admin_approved, is_super_admin, gym_main_image_url, gym_optional_images_urls, gym_video_url, gym_video_file_url, gym_monthly_fee, gym_trainer_fee, gym_latitude, gym_longitude ON public.profiles FOR EACH ROW EXECUTE FUNCTION sync_gym_from_profile();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_workout_days_updated_at BEFORE UPDATE ON public.workout_days FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_workout_exercises_updated_at BEFORE UPDATE ON public.workout_exercises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bmi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_traffic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- RLS policies (public + storage)
-- ---------------------------------------------------------------------------

CREATE POLICY "Admins can update own notifications" ON public.admin_notifications AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = recipient_user_id));
CREATE POLICY "Admins can view own notifications" ON public.admin_notifications AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = recipient_user_id));
CREATE POLICY "Members insert own checkin" ON public.attendance_checkins AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users read own attendance" ON public.attendance_checkins AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND ((p.is_super_admin = true) OR (p.user_id = p.gym_owner_id) OR (p.gym_owner_id = p.gym_owner_id)))))));
CREATE POLICY attendance_insert_own ON public.attendance_checkins AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));
CREATE POLICY attendance_no_delete ON public.attendance_checkins AS PERMISSIVE FOR DELETE TO authenticated USING (false);
CREATE POLICY attendance_select_gym_owner ON public.attendance_checkins AS PERMISSIVE FOR SELECT TO authenticated USING (((gym_owner_id = auth.uid()) OR (gym_owner_id IN ( SELECT p.gym_owner_id
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.gym_owner_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM user_roles ur
          WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::app_role)))))))));
CREATE POLICY attendance_select_own ON public.attendance_checkins AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY attendance_update_gym_owner ON public.attendance_checkins AS PERMISSIVE FOR UPDATE TO authenticated USING (((gym_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::app_role) AND ((attendance_checkins.gym_owner_id = auth.uid()) OR (attendance_checkins.gym_owner_id = ( SELECT p.gym_owner_id
           FROM profiles p
          WHERE (p.user_id = auth.uid()))))))))) WITH CHECK (((gym_owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::app_role))))));
CREATE POLICY attendance_update_own ON public.attendance_checkins AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));
CREATE POLICY "Users can delete own BMI records" ON public.bmi_records AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own BMI records" ON public.bmi_records AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own BMI records" ON public.bmi_records AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can view own BMI records" ON public.bmi_records AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users insert own bookings" ON public.class_bookings AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users read own bookings" ON public.class_bookings AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Anyone read scheduled sessions" ON public.class_sessions AS PERMISSIVE FOR SELECT TO public USING ((status = 'scheduled'::text));
CREATE POLICY "Super admins can read contact messages" ON public.contact_messages AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.is_super_admin = true)))));
CREATE POLICY "Anyone read active classes" ON public.gym_classes AS PERMISSIVE FOR SELECT TO public USING ((is_active = true));
CREATE POLICY "Anyone read published reviews" ON public.gym_reviews AS PERMISSIVE FOR SELECT TO public USING ((is_published = true));
CREATE POLICY "Members update own review" ON public.gym_reviews AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Members write own review" ON public.gym_reviews AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Owners manage own gym row" ON public.gyms AS PERMISSIVE FOR ALL TO public USING (((owner_user_id = auth.uid()) OR is_super_admin(auth.uid()))) WITH CHECK (((owner_user_id = auth.uid()) OR is_super_admin(auth.uid())));
CREATE POLICY "Public can read published gyms" ON public.gyms AS PERMISSIVE FOR SELECT TO public USING ((is_published = true));
CREATE POLICY "Public can insert newsletter subscriptions" ON public.newsletter_subscriptions AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Superadmins can delete newsletter subscriptions" ON public.newsletter_subscriptions AS PERMISSIVE FOR DELETE TO public USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.is_super_admin = true)))));
CREATE POLICY "Superadmins can read all newsletter subscriptions" ON public.newsletter_subscriptions AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.is_super_admin = true)))));
CREATE POLICY "Superadmins can update newsletter subscriptions" ON public.newsletter_subscriptions AS PERMISSIVE FOR UPDATE TO public USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.is_super_admin = true)))));
CREATE POLICY "Users can delete own notifications" ON public.notifications AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own notifications" ON public.notifications AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can read own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users manage own personal records" ON public.personal_records AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Anyone can read published promotions" ON public.platform_promotions AS PERMISSIVE FOR SELECT TO public USING (((is_published = true) AND (show_on_home = true) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at >= now()))));
CREATE POLICY "Superadmins manage promotions" ON public.platform_promotions AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.is_super_admin = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.is_super_admin = true)))));
CREATE POLICY platform_settings_select_authenticated ON public.platform_settings AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Gym admins can update gym profiles" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((has_role(auth.uid(), 'admin'::app_role) AND ((user_id = auth.uid()) OR (gym_owner_id = auth.uid())))) WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) AND ((user_id = auth.uid()) OR (gym_owner_id = auth.uid()))));
CREATE POLICY "Gym admins can view gym profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((has_role(auth.uid(), 'admin'::app_role) AND ((user_id = auth.uid()) OR (gym_owner_id = auth.uid()))));
CREATE POLICY "Members can view own gym owner profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (((user_id = my_gym_owner_id()) AND (user_id IS DISTINCT FROM auth.uid())));
CREATE POLICY "Super admins can approve admins" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() IN ( SELECT profiles_1.id
   FROM profiles profiles_1
  WHERE ((profiles_1.role = 'super_admin'::text) AND (profiles_1.is_approved = true)))));
CREATE POLICY "Super admins can manage all profiles" ON public.profiles AS PERMISSIVE FOR ALL TO public USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Super admins can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING (is_super_admin(auth.uid()));
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can insert their own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users can update their own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = id));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY profiles_insert_own ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));
CREATE POLICY profiles_select_own ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = id));
CREATE POLICY profiles_select_super_admin ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY profiles_update_own ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY profiles_update_super_admin ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "Superadmins read email log" ON public.promotion_email_log AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.is_super_admin = true)))));
CREATE POLICY "Admins can delete reviews" ON public.reviews AS PERMISSIVE FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.is_super_admin = true))))));
CREATE POLICY "Admins can update reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.role = 'admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND (p.is_super_admin = true))))));
CREATE POLICY "Anyone can view approved reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO public USING ((is_approved = true));
CREATE POLICY "Users can insert their own reviews" ON public.reviews AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own pending reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO authenticated USING (((auth.uid() = user_id) AND (is_approved = false))) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Gym admins manage gym member roles" ON public.user_roles AS PERMISSIVE FOR ALL TO public USING ((has_role(auth.uid(), 'admin'::app_role) AND ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = user_roles.user_id) AND (p.gym_owner_id = auth.uid()))))))) WITH CHECK ((has_role(auth.uid(), 'admin'::app_role) AND ((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = user_roles.user_id) AND (p.gym_owner_id = auth.uid())))))));
CREATE POLICY "Super admins manage roles" ON public.user_roles AS PERMISSIVE FOR ALL TO public USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Users can view own role" ON public.user_roles AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = user_id));
CREATE POLICY "Users manage own workout days" ON public.workout_days AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users manage own workout exercises" ON public.workout_exercises AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Avatar owner delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "Avatar owner update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "Avatar owner upload" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "Avatar public read" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'avatars'::text));
CREATE POLICY "Gym media owner delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'gym-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "Gym media owner update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'gym-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "Gym media owner upload" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'gym-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "Gym media public read" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'gym-media'::text));
CREATE POLICY "Public read gym-media" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'gym-media'::text));
CREATE POLICY "Super admin delete promotions media" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'gym-media'::text) AND ((storage.foldername(name))[1] = 'promotions'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND ((p.is_super_admin = true) OR (lower(COALESCE(p.email, ''::text)) = 'superadmin@forge.test'::text)))))));
CREATE POLICY "Super admin update promotions media" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'gym-media'::text) AND ((storage.foldername(name))[1] = 'promotions'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND ((p.is_super_admin = true) OR (lower(COALESCE(p.email, ''::text)) = 'superadmin@forge.test'::text))))))) WITH CHECK (((bucket_id = 'gym-media'::text) AND ((storage.foldername(name))[1] = 'promotions'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text)));
CREATE POLICY "Super admin upload promotions media" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'gym-media'::text) AND ((storage.foldername(name))[1] = 'promotions'::text) AND ((storage.foldername(name))[2] = (auth.uid())::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.user_id = auth.uid()) AND ((p.is_super_admin = true) OR (lower(COALESCE(p.email, ''::text)) = 'superadmin@forge.test'::text)))))));
CREATE POLICY "Users delete own gym-media" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'gym-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "Users update own gym-media" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'gym-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text))) WITH CHECK (((bucket_id = 'gym-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "Users upload own gym-media" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'gym-media'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_notifications TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_notifications TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.admin_notifications TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.attendance_checkins TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.attendance_checkins TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.attendance_checkins TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.bmi_records TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.bmi_records TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.bmi_records TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.class_bookings TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.class_bookings TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.class_bookings TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.class_sessions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.class_sessions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.class_sessions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contact_messages TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contact_messages TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.contact_messages TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.gym_classes TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.gym_classes TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.gym_classes TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.gym_reviews TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.gym_reviews TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.gym_reviews TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.gyms TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.gyms TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.gyms TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.newsletter_subscriptions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.newsletter_subscriptions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.newsletter_subscriptions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.notifications TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.notifications TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.notifications TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.personal_records TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.personal_records TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.personal_records TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.platform_promotions TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.platform_promotions TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.platform_promotions TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.platform_settings TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.platform_settings TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.platform_settings TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.profiles TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.promotion_email_log TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.promotion_email_log TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.promotion_email_log TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.public_traffic TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.public_traffic TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.public_traffic TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.reviews TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.reviews TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.reviews TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_roles TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_roles TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.user_roles TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workout_days TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workout_days TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workout_days TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workout_exercises TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workout_exercises TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.workout_exercises TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_deletion_scheduled(p_email text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_deletion_scheduled(p_email text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_deletion_scheduled(p_email text) TO anon;
GRANT EXECUTE ON FUNCTION public.cancel_deletion_scheduled(p_email text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_newsletter_subscription(p_email text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_newsletter_subscription(p_email text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_newsletter_subscription(p_email text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_newsletter_subscription(p_email text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_user_exists(check_email text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_user_exists(check_email text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_exists(check_email text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_exists(check_email text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_user_verified(user_email text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_user_verified(user_email text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_verified(user_email text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_verified(user_email text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_subscriptions() TO anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_subscriptions() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_subscriptions() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO anon;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_roles() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_newsletter_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_newsletter_subscriptions() TO anon;
GRANT EXECUTE ON FUNCTION public.get_newsletter_subscriptions() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_newsletter_subscriptions() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_email_confirmed() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_email_confirmed() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_email_confirmed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_email_confirmed() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_user_email_confirmed() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_user_email_confirmed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_user_email_confirmed() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_user_email_confirmed() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(_user_id uuid, _role app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(_user_id uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(_user_id uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin(_user_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(_user_id uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.my_gym_owner_id() TO anon;
GRANT EXECUTE ON FUNCTION public.my_gym_owner_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_gym_owner_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_gym_owner_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_approved_admins(p_from_user_id uuid, p_title text, p_message text) TO anon;
GRANT EXECUTE ON FUNCTION public.notify_approved_admins(p_from_user_id uuid, p_title text, p_message text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_approved_admins(p_from_user_id uuid, p_title text, p_message text) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_approved_admins(p_from_user_id uuid, p_title text, p_message text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.profiles_block_privilege_escalation() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.profiles_block_privilege_escalation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.profiles_block_privilege_escalation() TO service_role;
GRANT EXECUTE ON FUNCTION public.profiles_block_privilege_escalation() TO anon;
GRANT EXECUTE ON FUNCTION public.set_newsletter_preference(p_email text, p_subscribe boolean, p_reason text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_newsletter_preference(p_email text, p_subscribe boolean, p_reason text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_newsletter_preference(p_email text, p_subscribe boolean, p_reason text) TO anon;
GRANT EXECUTE ON FUNCTION public.set_newsletter_preference(p_email text, p_subscribe boolean, p_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_to_newsletter(p_email text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_to_newsletter(p_email text) TO anon;
GRANT EXECUTE ON FUNCTION public.subscribe_to_newsletter(p_email text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_to_newsletter(p_email text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_gym_from_profile() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_gym_from_profile() TO anon;
GRANT EXECUTE ON FUNCTION public.sync_gym_from_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_gym_from_profile() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_my_signup_profile() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_my_signup_profile() TO anon;
GRANT EXECUTE ON FUNCTION public.sync_my_signup_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_my_signup_profile() TO service_role;
GRANT EXECUTE ON FUNCTION public.unsubscribe_from_newsletter(p_email text, p_reason text) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.unsubscribe_from_newsletter(p_email text, p_reason text) TO anon;
GRANT EXECUTE ON FUNCTION public.unsubscribe_from_newsletter(p_email text, p_reason text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_from_newsletter(p_email text, p_reason text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_newsletter_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.update_newsletter_updated_at() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_newsletter_updated_at() TO anon;
GRANT EXECUTE ON FUNCTION public.update_newsletter_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO anon;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

-- ---------------------------------------------------------------------------
-- Realtime publications
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND to_regclass('public.admin_notifications') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_rel px
       JOIN pg_class pc ON pc.oid = px.prrelid
       JOIN pg_namespace pn ON pn.oid = pc.relnamespace
       JOIN pg_publication pp ON pp.oid = px.prpubid
       WHERE pp.pubname = 'supabase_realtime'
         AND pn.nspname = 'public'
         AND pc.relname = 'admin_notifications'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND to_regclass('public.notifications') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_rel px
       JOIN pg_class pc ON pc.oid = px.prrelid
       JOIN pg_namespace pn ON pn.oid = pc.relnamespace
       JOIN pg_publication pp ON pp.oid = px.prpubid
       WHERE pp.pubname = 'supabase_realtime'
         AND pn.nspname = 'public'
         AND pc.relname = 'notifications'
     ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Storage buckets (seed)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at) VALUES ('avatars', 'avatars', true, '5242880', '{image/jpeg,image/png,image/webp,image/gif}', now(), now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at) VALUES ('gym-media', 'gym-media', true, '52428800', '{image/jpeg,image/jpg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime}', now(), now()) ON CONFLICT (id) DO NOTHING;
