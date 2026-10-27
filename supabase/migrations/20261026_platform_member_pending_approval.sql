-- Platform members (and all non-admin signups) start pending approval.
-- Super admin approves platform members; gym owner approves gym customers.

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
  v_gym_name text;
  v_gym_owner_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT raw_user_meta_data, email INTO v_meta, v_email
  FROM auth.users WHERE id = v_uid;

  IF lower(COALESCE(v_meta ->> 'requested_role', 'user')) = 'admin' THEN
    v_role := 'admin'::public.app_role;
    v_admin_approved := false;
    v_gym_owner_id := v_uid;
  ELSE
    v_role := 'user'::public.app_role;
    -- Customers + platform members both need approval before dashboard access
    v_admin_approved := false;
    BEGIN
      v_gym_owner_id := NULLIF(trim(COALESCE(v_meta ->> 'gym_owner_id', '')), '')::uuid;
    EXCEPTION WHEN others THEN
      v_gym_owner_id := NULL;
    END;
  END IF;

  v_name := COALESCE(v_meta ->> 'full_name', split_part(v_email, '@', 1));

  INSERT INTO public.profiles (
    id, user_id, email, full_name, phone, address, emergency_contact,
    admin_approved, approval_requested_at,
    gym_owner_id,
    membership_status, membership_type, account_status
  ) VALUES (
    v_uid, v_uid, v_email, v_name,
    v_meta ->> 'phone', v_meta ->> 'address', v_meta ->> 'emergency_contact',
    v_admin_approved,
    now(),
    v_gym_owner_id,
    'pending', 'basic', 'pending'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    address = COALESCE(EXCLUDED.address, profiles.address),
    emergency_contact = COALESCE(EXCLUDED.emergency_contact, profiles.emergency_contact),
    admin_approved = EXCLUDED.admin_approved,
    approval_requested_at = COALESCE(profiles.approval_requested_at, EXCLUDED.approval_requested_at),
    gym_owner_id = COALESCE(EXCLUDED.gym_owner_id, profiles.gym_owner_id),
    membership_status = COALESCE(EXCLUDED.membership_status, profiles.membership_status),
    account_status = COALESCE(EXCLUDED.account_status, profiles.account_status),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, v_role)
  ON CONFLICT DO NOTHING;

  IF v_role = 'admin' THEN
    v_gym_name := NULLIF(trim(COALESCE(v_meta ->> 'gym_name', '')), '');
    IF v_gym_name IS NOT NULL THEN
      INSERT INTO public.gyms (
        owner_user_id, name, gym_type, city,
        years_operating, operating_days, peak_hours, member_capacity,
        owner_display_name, is_published, updated_at
      ) VALUES (
        v_uid, v_gym_name,
        v_meta ->> 'gym_type',
        v_meta ->> 'gym_city',
        v_meta ->> 'gym_years_operating',
        CASE WHEN COALESCE(v_meta ->> 'gym_operating_days', '') <> ''
          THEN (v_meta ->> 'gym_operating_days')::integer ELSE NULL END,
        v_meta ->> 'gym_peak_hours',
        v_meta ->> 'gym_member_capacity',
        v_name,
        false,
        now()
      )
      ON CONFLICT (owner_user_id) DO UPDATE SET
        name = EXCLUDED.name,
        gym_type = COALESCE(EXCLUDED.gym_type, gyms.gym_type),
        city = COALESCE(EXCLUDED.city, gyms.city),
        years_operating = COALESCE(EXCLUDED.years_operating, gyms.years_operating),
        operating_days = COALESCE(EXCLUDED.operating_days, gyms.operating_days),
        peak_hours = COALESCE(EXCLUDED.peak_hours, gyms.peak_hours),
        member_capacity = COALESCE(EXCLUDED.member_capacity, gyms.member_capacity),
        owner_display_name = COALESCE(EXCLUDED.owner_display_name, gyms.owner_display_name),
        updated_at = now();
    END IF;
  END IF;

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
$function$;
