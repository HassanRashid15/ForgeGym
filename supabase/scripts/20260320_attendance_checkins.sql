-- Attendance check-ins / check-outs with gender-based time slots
-- Safe to re-run when an older stub table already exists without newer columns.

CREATE TABLE IF NOT EXISTS public.attendance_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add columns for older stub tables (order matters — add before any COMMENT/UPDATE on them)
ALTER TABLE public.attendance_checkins
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz;

ALTER TABLE public.attendance_checkins
  ADD COLUMN IF NOT EXISTS slot text;

ALTER TABLE public.attendance_checkins
  ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.attendance_checkins
  ADD COLUMN IF NOT EXISTS role text;

ALTER TABLE public.attendance_checkins
  ADD COLUMN IF NOT EXISTS full_name text;

ALTER TABLE public.attendance_checkins
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

ALTER TABLE public.attendance_checkins
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.attendance_checkins
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Backfill slot for legacy rows (local wall-clock hour approximation via timezone)
UPDATE public.attendance_checkins
SET slot = CASE
  WHEN EXTRACT(HOUR FROM checked_in_at) BETWEEN 5 AND 11 THEN 'morning'
  WHEN EXTRACT(HOUR FROM checked_in_at) BETWEEN 12 AND 16 THEN 'afternoon'
  ELSE 'evening'
END
WHERE slot IS NULL;

ALTER TABLE public.attendance_checkins
  ALTER COLUMN slot SET DEFAULT 'morning';

-- Ensure NOT NULL after backfill
UPDATE public.attendance_checkins
SET slot = 'morning'
WHERE slot IS NULL;

DO $$
BEGIN
  ALTER TABLE public.attendance_checkins
    ALTER COLUMN slot SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attendance_checkins_slot_check'
      AND conrelid = 'public.attendance_checkins'::regclass
  ) THEN
    ALTER TABLE public.attendance_checkins
      ADD CONSTRAINT attendance_checkins_slot_check
      CHECK (slot IN ('morning', 'afternoon', 'evening'));
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_gym_checked_in
  ON public.attendance_checkins (gym_owner_id, checked_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_user_checked_in
  ON public.attendance_checkins (user_id, checked_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_open_session
  ON public.attendance_checkins (user_id, gym_owner_id)
  WHERE checked_out_at IS NULL;

COMMENT ON TABLE public.attendance_checkins IS
  'Gym visit check-in/out. Female: morning/afternoon/evening; Male: morning/evening only.';

COMMENT ON COLUMN public.attendance_checkins.slot IS
  'Time slot at check-in: morning | afternoon | evening';

COMMENT ON COLUMN public.attendance_checkins.checked_out_at IS
  'Set when the person checks out; null means still in gym';
