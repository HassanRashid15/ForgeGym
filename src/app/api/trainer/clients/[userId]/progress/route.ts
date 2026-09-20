import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import {
  computeStreak,
  listPersonalRecords,
  listWorkoutDaysWithExercises,
} from "@/lib/progress";
import { lastNDateISOs, localDateISO, dateRangeISOs } from "@/lib/progress-catalog";
import { getGymByOwnerId } from "@/lib/gyms";
import { feeBreakdownLabel, formatMemberFee } from "@/lib/fees";

async function requireTrainer(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const { supabase, user } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const { data: roleRows } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isTrainer = (roleRows || []).some((r) => r.role === "trainer");
  if (!isTrainer) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — trainer only" },
        { status: 403 },
      ),
    };
  }

  return { supabase: db, user };
}

type RouteContext = { params: Promise<{ userId: string }> };

/**
 * GET /api/trainer/clients/[userId]/progress
 * Member workout days + exercises (only if assigned to this trainer).
 */
export async function GET(request: Request, context: RouteContext) {
  const auth = await requireTrainer(request);
  if ("error" in auth) return auth.error;

  const { supabase, user: trainer } = auth;
  const { userId: memberId } = await context.params;
  if (!memberId) {
    return NextResponse.json({ error: "Member id required" }, { status: 400 });
  }

  const { data: member, error: memberError } = await supabase
    .from("profiles")
    .select(
      "user_id, full_name, email, phone, avatar_url, membership_status, membership_type, fitness_goal, experience_level, join_date, created_at, preferred_trainer_id, gym_owner_id, fee_concession, weight_kg, height_cm, bmi",
    )
    .eq("user_id", memberId)
    .eq("preferred_trainer_id", trainer.id)
    .maybeSingle();

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }
  if (!member) {
    return NextResponse.json(
      { error: "Member not found or not assigned to you" },
      { status: 404 },
    );
  }

  let gymMonthlyFee: string | null = null;
  let trainerFee: string | null = null;
  const gymOwnerId = (member.gym_owner_id as string | null) || null;
  if (gymOwnerId) {
    const gym = await getGymByOwnerId(gymOwnerId);
    gymMonthlyFee = gym?.monthlyFee || null;
    trainerFee = gym?.trainerFee || null;
    if (!gymMonthlyFee || !trainerFee) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("gym_monthly_fee, gym_trainer_fee")
        .eq("user_id", gymOwnerId)
        .maybeSingle();
      gymMonthlyFee =
        gymMonthlyFee ||
        (ownerProfile?.gym_monthly_fee as string | null) ||
        null;
      trainerFee =
        trainerFee ||
        (ownerProfile?.gym_trainer_fee as string | null) ||
        null;
    }
  }
  const feeConcession = (member.fee_concession as string | null) || null;
  const monthlyFee = formatMemberFee(
    gymMonthlyFee,
    trainerFee,
    true,
    feeConcession,
  );
  const feeBreakdown = feeBreakdownLabel(
    gymMonthlyFee,
    trainerFee,
    true,
    feeConcession,
  );

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
      Math.max(1, parseInt(searchParams.get("days") || "14", 10) || 14),
    );
    dateWindow = lastNDateISOs(daysCount);
  }

  if (dateWindow.length === 0) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const fromDate = dateWindow[0];
  const toDate = dateWindow[dateWindow.length - 1];
  const today = localDateISO();

  try {
    const [workoutDays, personalRecords] = await Promise.all([
      listWorkoutDaysWithExercises(supabase, memberId, fromDate, toDate),
      listPersonalRecords(supabase, memberId),
    ]);

    const byDate = new Map(workoutDays.map((d) => [d.day_date, d]));
    const days = dateWindow.map((date) => {
      const row = byDate.get(date);
      return {
        date,
        id: row?.id ?? null,
        focus: row?.focus ?? "",
        notes: row?.notes ?? null,
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
      (n, d) => n + (d.duration_minutes || 0),
      0,
    );
    const totalCalories = days.reduce((n, d) => n + (d.calories || 0), 0);

    // Distinct exercise names across the window
    const exerciseNames = new Map<string, number>();
    for (const d of days) {
      for (const ex of d.exercises) {
        const name = (ex.exercise_name || "").trim();
        if (!name) continue;
        exerciseNames.set(name, (exerciseNames.get(name) || 0) + 1);
      }
    }
    const topExercises = [...exerciseNames.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name, count }));

    return NextResponse.json({
      member: {
        userId: member.user_id,
        fullName: member.full_name || "Member",
        email: member.email || null,
        phone: member.phone || null,
        avatarUrl: member.avatar_url || null,
        membershipStatus: member.membership_status || null,
        membershipType: member.membership_type || null,
        fitnessGoal: member.fitness_goal || null,
        experienceLevel: member.experience_level || null,
        joinDate: member.join_date || member.created_at || null,
        weightKg: member.weight_kg ?? null,
        heightCm: member.height_cm ?? null,
        bmi: member.bmi ?? null,
        gymMonthlyFee,
        trainerFee,
        feeConcession,
        monthlyFee,
        feeBreakdown,
      },
      days,
      personalRecords,
      topExercises,
      stats: {
        trainedDays: trainedDays.length,
        totalExercises,
        totalSets,
        totalDuration,
        totalCalories,
        streak: computeStreak(workoutDays, today),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to load progress",
      },
      { status: 400 },
    );
  }
}
