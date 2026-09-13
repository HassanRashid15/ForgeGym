-- Member workout progress: days (focus), exercises (sets/reps), personal records

CREATE TABLE IF NOT EXISTS public.workout_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_date date NOT NULL,
  focus text NOT NULL DEFAULT '',
  notes text,
  duration_minutes integer,
  calories integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_date)
);

CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_day_id uuid NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  sets integer NOT NULL DEFAULT 3 CHECK (sets > 0 AND sets <= 50),
  reps integer NOT NULL DEFAULT 10 CHECK (reps > 0 AND reps <= 500),
  weight text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name text NOT NULL,
  value text NOT NULL,
  unit text NOT NULL DEFAULT 'lbs',
  improvement text,
  achieved_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workout_days_user_date_idx
  ON public.workout_days (user_id, day_date DESC);

CREATE INDEX IF NOT EXISTS workout_exercises_day_idx
  ON public.workout_exercises (workout_day_id, sort_order);

CREATE INDEX IF NOT EXISTS workout_exercises_user_idx
  ON public.workout_exercises (user_id);

CREATE INDEX IF NOT EXISTS personal_records_user_idx
  ON public.personal_records (user_id, achieved_at DESC);

ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own workout days" ON public.workout_days;
CREATE POLICY "Users manage own workout days"
  ON public.workout_days FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own workout exercises" ON public.workout_exercises;
CREATE POLICY "Users manage own workout exercises"
  ON public.workout_exercises FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own personal records" ON public.personal_records;
CREATE POLICY "Users manage own personal records"
  ON public.personal_records FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_workout_days_updated_at ON public.workout_days;
CREATE TRIGGER set_workout_days_updated_at
  BEFORE UPDATE ON public.workout_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_workout_exercises_updated_at ON public.workout_exercises;
CREATE TRIGGER set_workout_exercises_updated_at
  BEFORE UPDATE ON public.workout_exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_personal_records_updated_at ON public.personal_records;
CREATE TRIGGER set_personal_records_updated_at
  BEFORE UPDATE ON public.personal_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
