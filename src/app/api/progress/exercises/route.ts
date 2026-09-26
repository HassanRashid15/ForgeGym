import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { addWorkoutExercise, deleteWorkoutExercise } from "@/lib/progress";
import { isProgressDayLocked } from "@/lib/progress-catalog";
import { notify } from "@/lib/notify-actions";

/** POST /api/progress/exercises — add exercise to a workout day */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user, supabase } = auth;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const workout_day_id = String(body.workout_day_id || "").trim();
  const exercise_name = String(body.exercise_name || "").trim();
  const sets = Number(body.sets);
  const reps = Number(body.reps);
  const weight = body.weight != null ? String(body.weight) : null;

  if (!workout_day_id || !exercise_name) {
    return jsonError("workout_day_id and exercise_name are required", 400);
  }
  if (!Number.isFinite(sets) || sets < 1 || sets > 50) {
    return jsonError("sets must be between 1 and 50", 400);
  }
  if (!Number.isFinite(reps) || reps < 1 || reps > 500) {
    return jsonError("reps must be between 1 and 500", 400);
  }

  // Ensure the day belongs to this user
  const { data: day } = await supabase
    .from("workout_days")
    .select("id, day_date, focus")
    .eq("id", workout_day_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!day) {
    return jsonError("Workout day not found", 404);
  }
  if (isProgressDayLocked(String(day.day_date))) {
    return jsonError(
      "This day is locked — past workouts are view-only after 24 hours",
      403,
    );
  }

  try {
    const exercise = await addWorkoutExercise(supabase, user.id, {
      workout_day_id,
      exercise_name,
      sets,
      reps,
      weight,
    });
    void notify.progressExerciseDone(
      user.id,
      exercise_name,
      sets,
      reps,
      weight,
      day.focus ? String(day.focus) : null,
    );
    return NextResponse.json({ exercise });
  } catch (err: any) {
    return jsonError(err?.message || "Failed to add exercise", 400);
  }
}

/** DELETE /api/progress/exercises?id=... */
export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user, supabase } = auth;
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return jsonError("id required", 400);

  const { data: exercise } = await supabase
    .from("workout_exercises")
    .select("id, workout_day_id, exercise_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!exercise) {
    return jsonError("Exercise not found", 404);
  }

  const { data: day } = await supabase
    .from("workout_days")
    .select("day_date")
    .eq("id", exercise.workout_day_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (day && isProgressDayLocked(String(day.day_date))) {
    return jsonError(
      "This day is locked — past workouts are view-only after 24 hours",
      403,
    );
  }

  try {
    await deleteWorkoutExercise(supabase, user.id, id);
    void notify.progressExerciseRemoved(
      user.id,
      String(exercise.exercise_name || "Exercise"),
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return jsonError(err?.message || "Failed to delete exercise", 400);
  }
}
