import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import {
  computeStreak,
  createPersonalRecord,
  listPersonalRecords,
  listWorkoutDaysWithExercises,
  upsertWorkoutDay,
} from "@/lib/progress";
import {
  lastNDateISOs,
  localDateISO,
  dateRangeISOs,
  isProgressDayLocked,
  getFocusSaveCount,
  isFocusSaveLocked,
  MAX_FOCUS_SAVES,
  parseProgressDayNotes,
  serializeProgressDayNotes,
} from "@/lib/progress-catalog";
import { notify } from "@/lib/notify-actions";

/** GET /api/progress — days (default last 6) + PRs + stats */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user, supabase } = auth;
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from")?.trim() || "";
  const toParam = searchParams.get("to")?.trim() || "";
  const isoOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

  let dateWindow: string[];
  if (isoOk(fromParam) && isoOk(toParam)) {
    dateWindow = dateRangeISOs(fromParam, toParam);
  } else {
    const daysCount = Math.min(
      62,
      Math.max(1, parseInt(searchParams.get("days") || "6", 10) || 6),
    );
    dateWindow = lastNDateISOs(daysCount);
  }

  if (dateWindow.length === 0) {
    return jsonError("Invalid date range", 400);
  }

  const fromDate = dateWindow[0];
  const toDate = dateWindow[dateWindow.length - 1];
  const today = localDateISO();

  try {
    const [workoutDays, personalRecords] = await Promise.all([
      listWorkoutDaysWithExercises(supabase, user.id, fromDate, toDate),
      listPersonalRecords(supabase, user.id),
    ]);

    const byDate = new Map(workoutDays.map((d) => [d.day_date, d]));
    const days = dateWindow.map((date) => {
      const row = byDate.get(date);
      const notes = row?.notes ?? null;
      return {
        date,
        id: row?.id ?? null,
        focus: row?.focus ?? "",
        notes,
        focus_saves: getFocusSaveCount(notes),
        focus_locked: isFocusSaveLocked(notes),
        duration_minutes: row?.duration_minutes ?? null,
        calories: row?.calories ?? null,
        exercises: row?.exercises ?? [],
      };
    });

    const trainedDays = days.filter(
      (d) => d.focus && d.focus.toLowerCase() !== "rest",
    );
    const totalExercises = days.reduce((n, d) => n + d.exercises.length, 0);
    const totalSets = days.reduce(
      (n, d) => n + d.exercises.reduce((s, e) => s + (e.sets || 0), 0),
      0,
    );
    const totalDuration = days.reduce(
      (n, d) =>
        n +
        (d.duration_minutes ||
          d.exercises.reduce((s, e) => {
            const sets = e.sets || 0;
            // ~45s work + 2m rest between sets (guided-session defaults)
            const sec = sets * 45 + Math.max(0, sets - 1) * 120;
            return s + Math.max(sets > 0 ? 1 : 0, Math.round(sec / 60));
          }, 0)),
      0,
    );
    const totalCalories = days.reduce((n, d) => n + (d.calories || 0), 0);

    return NextResponse.json({
      days,
      personalRecords,
      stats: {
        trainedDays: trainedDays.length,
        totalExercises,
        totalSets,
        totalDuration,
        totalCalories,
        streak: computeStreak(workoutDays, today),
      },
    });
  } catch (err: any) {
    return jsonError(err?.message || "Failed to load progress", 400);
  }
}

/** POST /api/progress — upsert day focus or create PR */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user, supabase } = auth;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action || "");

  try {
    if (action === "upsert_day") {
      const day_date = String(body.day_date || "").trim();
      const focus = String(body.focus || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day_date)) {
        return jsonError("Valid day_date (YYYY-MM-DD) is required", 400);
      }
      if (!focus) {
        return jsonError("Focus is required (select or enter custom)", 400);
      }
      if (isProgressDayLocked(day_date)) {
        return jsonError(
          "This day is locked — past workouts are view-only after 24 hours",
          403,
        );
      }

      const { data: existing } = await supabase
        .from("workout_days")
        .select("id, focus, notes, duration_minutes, calories")
        .eq("user_id", user.id)
        .eq("day_date", day_date)
        .maybeSingle();

      const prevSaves = getFocusSaveCount(existing?.notes);
      const prevFocus = String(existing?.focus || "").trim();
      const focusChanged =
        !existing || prevFocus.toLowerCase() !== focus.toLowerCase();

      if (prevSaves >= MAX_FOCUS_SAVES && focusChanged) {
        return jsonError(
          `Focus is locked after ${MAX_FOCUS_SAVES} changes for this day`,
          403,
        );
      }

      const meta = parseProgressDayNotes(existing?.notes);
      if (prevSaves < MAX_FOCUS_SAVES) {
        meta.focus_saves = prevSaves + 1;
      }

      const day = await upsertWorkoutDay(supabase, user.id, {
        day_date,
        focus: prevSaves >= MAX_FOCUS_SAVES ? prevFocus || focus : focus,
        notes: serializeProgressDayNotes(meta),
        duration_minutes:
          body.duration_minutes != null && body.duration_minutes !== ""
            ? Number(body.duration_minutes)
            : existing?.duration_minutes ?? null,
        calories:
          body.calories != null && body.calories !== ""
            ? Number(body.calories)
            : existing?.calories ?? null,
      });

      const savedFocus = String(day.focus || focus);
      void notify.progressFocusSaved(user.id, savedFocus, day_date);

      return NextResponse.json({
        day: {
          ...day,
          focus_saves: getFocusSaveCount(day.notes),
          focus_locked: isFocusSaveLocked(day.notes),
        },
      });
    }

    if (action === "create_pr") {
      const exercise_name = String(body.exercise_name || "").trim();
      const value = String(body.value || "").trim();
      if (!exercise_name || !value) {
        return jsonError("Exercise name and value are required", 400);
      }
      const unit = body.unit != null ? String(body.unit) : "lbs";
      const record = await createPersonalRecord(supabase, user.id, {
        exercise_name,
        value,
        unit,
        improvement: body.improvement != null ? String(body.improvement) : null,
        achieved_at:
          body.achieved_at != null ? String(body.achieved_at) : undefined,
      });
      void notify.progressPrCreated(
        user.id,
        exercise_name,
        `${value}${unit ? ` ${unit}` : ""}`,
      );
      return NextResponse.json({ record });
    }

    return jsonError("Invalid action", 400);
  } catch (err: any) {
    return jsonError(err?.message || "Failed to save progress", 400);
  }
}
