-- Attendance RLS + hardening (safe to re-run)

ALTER TABLE public.attendance_checkins ENABLE ROW LEVEL SECURITY;

-- Members: read own rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_checkins'
      AND policyname = 'attendance_select_own'
  ) THEN
    CREATE POLICY attendance_select_own
      ON public.attendance_checkins
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Gym owners: read all rows for their gym
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_checkins'
      AND policyname = 'attendance_select_gym_owner'
  ) THEN
    CREATE POLICY attendance_select_gym_owner
      ON public.attendance_checkins
      FOR SELECT
      TO authenticated
      USING (
        gym_owner_id = auth.uid()
        OR gym_owner_id IN (
          SELECT p.gym_owner_id
          FROM public.profiles p
          WHERE p.user_id = auth.uid()
            AND p.gym_owner_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
            )
        )
      );
  END IF;
END $$;

-- Members: insert own check-in only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_checkins'
      AND policyname = 'attendance_insert_own'
  ) THEN
    CREATE POLICY attendance_insert_own
      ON public.attendance_checkins
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Members: update (check out) own open rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_checkins'
      AND policyname = 'attendance_update_own'
  ) THEN
    CREATE POLICY attendance_update_own
      ON public.attendance_checkins
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Gym owners: update rows in their gym (e.g. admin-assisted checkout)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_checkins'
      AND policyname = 'attendance_update_gym_owner'
  ) THEN
    CREATE POLICY attendance_update_gym_owner
      ON public.attendance_checkins
      FOR UPDATE
      TO authenticated
      USING (
        gym_owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
            AND (
              gym_owner_id = auth.uid()
              OR gym_owner_id = (
                SELECT p.gym_owner_id FROM public.profiles p WHERE p.user_id = auth.uid()
              )
            )
        )
      )
      WITH CHECK (
        gym_owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;
END $$;

-- No direct DELETE for authenticated clients (service role bypasses RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_checkins'
      AND policyname = 'attendance_no_delete'
  ) THEN
    CREATE POLICY attendance_no_delete
      ON public.attendance_checkins
      FOR DELETE
      TO authenticated
      USING (false);
  END IF;
END $$;

COMMENT ON TABLE public.attendance_checkins IS
  'Gym visit check-in/out with RLS. API uses service role; clients are limited to own rows (members) or gym roster (owners).';
