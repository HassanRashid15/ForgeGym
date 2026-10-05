-- Soft-launch DB reset: keep ONLY the seeded superadmin account
-- Email kept: superadmin@forge.test (auth user + profile + admin role)
--
-- Run in Supabase SQL Editor. THIS IS DESTRUCTIVE.
-- Review once, then execute.

DO $$
DECLARE
  keep_email text := 'superadmin@forge.test';
  keep_id uuid;
BEGIN
  SELECT id INTO keep_id
  FROM auth.users
  WHERE lower(email) = keep_email
  LIMIT 1;

  IF keep_id IS NULL THEN
    RAISE EXCEPTION 'Superadmin % not found in auth.users — aborting wipe', keep_email;
  END IF;

  RAISE NOTICE 'Keeping auth user % (%)', keep_email, keep_id;

  -- App data tables (ignore if missing)
  BEGIN DELETE FROM public.contact_messages; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.reviews; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.attendance_checkins; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.public_traffic; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.notifications; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.admin_notifications; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.workout_exercises; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.workout_days; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.personal_records; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.financial_records; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.gym_equipment; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.members; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.gyms; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Optional / later-feature tables
  BEGIN DELETE FROM public.newsletter_subscribers; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.newsletter_prefs; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.promotions; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.promotion_sends; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.gym_classes; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.class_sessions; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.class_bookings; EXCEPTION WHEN undefined_table THEN NULL; END;
  BEGIN DELETE FROM public.splash_visitors; EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Roles: keep only superadmin's roles
  DELETE FROM public.user_roles WHERE user_id IS DISTINCT FROM keep_id;

  -- Profiles: keep only superadmin
  DELETE FROM public.profiles WHERE user_id IS DISTINCT FROM keep_id;

  -- Ensure superadmin profile flags are correct
  UPDATE public.profiles
  SET
    is_super_admin = true,
    admin_approved = true,
    is_verified = true,
    login_enabled = true,
    updated_at = now()
  WHERE user_id = keep_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (keep_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Auth users: delete everyone except superadmin
  -- Cascades will clear remaining auth-linked rows
  DELETE FROM auth.users WHERE id IS DISTINCT FROM keep_id;

  RAISE NOTICE 'Wipe complete. Only % remains.', keep_email;
END $$;

-- Verify
SELECT
  u.id,
  u.email,
  p.is_super_admin,
  p.admin_approved,
  p.is_verified,
  ur.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
ORDER BY u.email;
