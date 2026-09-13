import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkoutExercise = {
  id: string;
  workout_day_id: string;
  user_id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type WorkoutDay = {
  id: string;
  user_id: string;
  day_date: string;
  focus: string;
  notes: string | null;
  duration_minutes: number | null;
  calories: number | null;
  created_at: string;
  updated_at: string;
  exercises?: WorkoutExercise[];
};

export type PersonalRecord = {
  id: string;
  user_id: string;
  exercise_name: string;
  value: string;
  unit: string;
  improvement: string | null;
  achieved_at: string;
  created_at: string;
  updated_at: string;
};

type Client = SupabaseClient<any>;

export async function listWorkoutDaysWithExercises(
  client: Client,
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<WorkoutDay[]> {
  const { data: days, error } = await client
    .from("workout_days")
    .select("*")
    .eq("user_id", userId)
    .gte("day_date", fromDate)
    .lte("day_date", toDate)
    .order("day_date", { ascending: true });

  if (error) throw new Error(error.message);
  const rows = (days || []) as WorkoutDay[];
  if (rows.length === 0) return [];

  const dayIds = rows.map((d) => d.id);
  const { data: exercises, error: exErr } = await client
    .from("workout_exercises")
    .select("*")
    .eq("user_id", userId)
    .in("workout_day_id", dayIds)
    .order("sort_order", { ascending: true });

  if (exErr) throw new Error(exErr.message);

  const byDay = new Map<string, WorkoutExercise[]>();
  for (const ex of (exercises || []) as WorkoutExercise[]) {
    const list = byDay.get(ex.workout_day_id) || [];
    list.push(ex);
    byDay.set(ex.workout_day_id, list);
  }

  return rows.map((d) => ({ ...d, exercises: byDay.get(d.id) || [] }));
}

export async function upsertWorkoutDay(
  client: Client,
  userId: string,
  input: {
    day_date: string;
    focus: string;
    notes?: string | null;
    duration_minutes?: number | null;
    calories?: number | null;
  },
): Promise<WorkoutDay> {
  const { data, error } = await client
    .from("workout_days")
    .upsert(
      {
        user_id: userId,
        day_date: input.day_date,
        focus: input.focus.trim(),
        notes: input.notes ?? null,
        duration_minutes: input.duration_minutes ?? null,
        calories: input.calories ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,day_date" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as WorkoutDay;
}

export async function addWorkoutExercise(
  client: Client,
  userId: string,
  input: {
    workout_day_id: string;
    exercise_name: string;
    sets: number;
    reps: number;
    weight?: string | null;
  },
): Promise<WorkoutExercise> {
  const { data: existing } = await client
    .from("workout_exercises")
    .select("sort_order")
    .eq("workout_day_id", input.workout_day_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder =
    existing && existing.length > 0 ? (existing[0].sort_order as number) + 1 : 0;

  const { data, error } = await client
    .from("workout_exercises")
    .insert({
      user_id: userId,
      workout_day_id: input.workout_day_id,
      exercise_name: input.exercise_name.trim(),
      sets: input.sets,
      reps: input.reps,
      weight: input.weight?.trim() || null,
      sort_order: nextOrder,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as WorkoutExercise;
}

export async function deleteWorkoutExercise(
  client: Client,
  userId: string,
  exerciseId: string,
): Promise<void> {
  const { error } = await client
    .from("workout_exercises")
    .delete()
    .eq("id", exerciseId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function listPersonalRecords(
  client: Client,
  userId: string,
): Promise<PersonalRecord[]> {
  const { data, error } = await client
    .from("personal_records")
    .select("*")
    .eq("user_id", userId)
    .order("achieved_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data || []) as PersonalRecord[];
}

export async function createPersonalRecord(
  client: Client,
  userId: string,
  input: {
    exercise_name: string;
    value: string;
    unit?: string;
    improvement?: string | null;
    achieved_at?: string;
  },
): Promise<PersonalRecord> {
  const { data, error } = await client
    .from("personal_records")
    .insert({
      user_id: userId,
      exercise_name: input.exercise_name.trim(),
      value: input.value.trim(),
      unit: (input.unit || "lbs").trim(),
      improvement: input.improvement?.trim() || null,
      achieved_at: input.achieved_at || new Date().toISOString().slice(0, 10),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PersonalRecord;
}

export async function deletePersonalRecord(
  client: Client,
  userId: string,
  id: string,
): Promise<void> {
  const { error } = await client
    .from("personal_records")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export function computeStreak(days: WorkoutDay[], todayIso: string): number {
  const active = new Set(
    days
      .filter((d) => d.focus && d.focus.toLowerCase() !== "rest")
      .map((d) => d.day_date),
  );
  let streak = 0;
  const cursor = new Date(`${todayIso}T12:00:00`);
  for (;;) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    const iso = `${y}-${m}-${day}`;
    if (!active.has(iso)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
