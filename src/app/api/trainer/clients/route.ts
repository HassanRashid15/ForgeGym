import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { getGymByOwnerId } from "@/lib/gyms";
import {
  feeBreakdownLabel,
  formatMemberFee,
  parseFeeAmount,
} from "@/lib/fees";

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

function formatMoneyLabel(
  amount: number,
  sampleFee: string | null | undefined,
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const symbol = (sampleFee || "").replace(/[0-9.,\s]/g, "").trim();
  const formatted = amount.toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  return symbol ? `${symbol} ${formatted}`.trim() : formatted;
}

/** GET /api/trainer/clients — members assigned to this trainer + fee stats */
export async function GET(request: Request) {
  const auth = await requireTrainer(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;

  const [{ data: trainerProfile }, { data: rows, error }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "user_id, full_name, email, gym_owner_id, gym_name, salary, pt_sessions, specialization, years_experience, max_client_capacity, employment_type, working_days, working_hours, availability, assigned_members",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select(
        "user_id, full_name, email, phone, avatar_url, membership_status, membership_type, fitness_goal, join_date, created_at, gym_owner_id, preferred_trainer_id, fee_concession",
      )
      .eq("preferred_trainer_id", user.id)
      .order("full_name", { ascending: true }),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const gymOwnerId =
    (trainerProfile?.gym_owner_id as string | null) ||
    (rows?.[0]?.gym_owner_id as string | null) ||
    null;

  let gymMonthlyFee: string | null = null;
  let trainerFee: string | null = null;
  let gymName: string | null =
    (trainerProfile?.gym_name as string | null) || null;

  if (gymOwnerId) {
    const gym = await getGymByOwnerId(gymOwnerId);
    gymMonthlyFee = gym?.monthlyFee || null;
    trainerFee = gym?.trainerFee || null;
    gymName = gym?.gymName || gymName;

    if (!gymMonthlyFee || !trainerFee) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("gym_name, gym_monthly_fee, gym_trainer_fee")
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
      gymName =
        gymName || (ownerProfile?.gym_name as string | null) || null;
    }
  }

  const clients = (rows || []).map((p) => {
    const feeConcession = (p.fee_concession as string | null) || null;
    const hasTrainer = true;
    const monthlyFee = formatMemberFee(
      gymMonthlyFee,
      trainerFee,
      hasTrainer,
      feeConcession,
    );
    return {
      userId: p.user_id as string,
      fullName: (p.full_name as string | null) || "Member",
      email: (p.email as string | null) || null,
      phone: (p.phone as string | null) || null,
      avatarUrl: (p.avatar_url as string | null) || null,
      membershipStatus: (p.membership_status as string | null) || null,
      membershipType: (p.membership_type as string | null) || null,
      fitnessGoal: (p.fitness_goal as string | null) || null,
      joinDate:
        (p.join_date as string | null) ||
        (p.created_at as string | null) ||
        null,
      gymMonthlyFee,
      trainerFee,
      feeConcession,
      monthlyFee,
      feeBreakdown: feeBreakdownLabel(
        gymMonthlyFee,
        trainerFee,
        hasTrainer,
        feeConcession,
      ),
    };
  });

  const clientCount = clients.length;
  const perPersonAmount = parseFeeAmount(trainerFee);
  const projectedTrainerRevenue = perPersonAmount * clientCount;
  const projectedMemberBilling = clients.reduce((sum, c) => {
    return sum + parseFeeAmount(c.monthlyFee);
  }, 0);

  return NextResponse.json({
    clients,
    gymName,
    gymMonthlyFee,
    trainerFee,
    stats: {
      clientCount,
      gymMonthlyFee,
      trainerFee,
      projectedTrainerRevenue: formatMoneyLabel(
        projectedTrainerRevenue,
        trainerFee || gymMonthlyFee,
      ),
      projectedTrainerRevenueAmount: projectedTrainerRevenue,
      projectedMemberBilling: formatMoneyLabel(
        projectedMemberBilling,
        gymMonthlyFee || trainerFee,
      ),
      projectedMemberBillingAmount: projectedMemberBilling,
    },
    trainer: {
      salary: (trainerProfile?.salary as string | null) || null,
      ptSessions: (trainerProfile?.pt_sessions as string | null) || null,
      specialization:
        (trainerProfile?.specialization as string | null) || null,
      yearsExperience:
        (trainerProfile?.years_experience as string | null) || null,
      maxClientCapacity:
        (trainerProfile?.max_client_capacity as string | null) || null,
      employmentType:
        (trainerProfile?.employment_type as string | null) || null,
      workingDays: (trainerProfile?.working_days as string | null) || null,
      workingHours: (trainerProfile?.working_hours as string | null) || null,
      availability: (trainerProfile?.availability as string | null) || null,
    },
  });
}
