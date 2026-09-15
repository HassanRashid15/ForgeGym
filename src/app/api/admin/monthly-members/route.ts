import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { getGymByOwnerId } from "@/lib/gyms";
import { formatCombinedFee } from "@/lib/fees";

function daysUntil(date: Date, now = new Date()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** Next monthly renewal after join, and days remaining in the current period. */
function monthlyPeriod(anchorIso: string | null | undefined, now = new Date()) {
  if (!anchorIso) {
    return {
      periodStart: null as string | null,
      periodEnd: null as string | null,
      daysLeft: null as number | null,
    };
  }

  const anchor = new Date(anchorIso);
  if (Number.isNaN(anchor.getTime())) {
    return { periodStart: null, periodEnd: null, daysLeft: null };
  }

  const periodStart = new Date(anchor);
  while (true) {
    const next = new Date(periodStart);
    next.setMonth(next.getMonth() + 1);
    if (next > now) break;
    periodStart.setMonth(periodStart.getMonth() + 1);
  }

  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    daysLeft: Math.max(0, daysUntil(periodEnd, now)),
  };
}

async function requireApprovedAdmin(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const { supabase, user } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const { data: roleRows } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdmin = (roleRows || []).some((r) => r.role === "admin");
  if (!isAdmin) {
    return {
      error: NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 }),
    };
  }

  const { data: profile } = await db
    .from("profiles")
    .select(
      "admin_approved, is_super_admin, email, gym_name, gym_owner_id, gym_city, gym_monthly_fee, gym_trainer_fee",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const email = (profile?.email || user.email || "").toLowerCase();
  const isSuperAdmin =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true ||
    email === "superadmin@forge.test";

  if (!isSuperAdmin && !profile?.admin_approved) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — your admin account is not approved yet" },
        { status: 403 },
      ),
    };
  }

  if (!service) {
    return {
      error: NextResponse.json(
        { error: "Server misconfigured — missing service role key" },
        { status: 500 },
      ),
    };
  }

  const gymOwnerId =
    (profile as { gym_owner_id?: string | null } | null)?.gym_owner_id || user.id;

  return {
    supabase: service,
    user,
    isSuperAdmin,
    gymOwnerId,
    gymMonthlyFee:
      (profile as { gym_monthly_fee?: string | null } | null)?.gym_monthly_fee || null,
    gymTrainerFee:
      (profile as { gym_trainer_fee?: string | null } | null)?.gym_trainer_fee || null,
  };
}

/**
 * GET /api/admin/monthly-members
 * Gym members with monthly fee + days left in current billing month (admin only).
 * Members with a preferred trainer are billed gym fee + trainer fee.
 */
export async function GET(request: Request) {
  const auth = await requireApprovedAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase, gymOwnerId, gymMonthlyFee, gymTrainerFee } = auth;

  const gym = await getGymByOwnerId(gymOwnerId);
  const baseMonthlyFee = gym?.monthlyFee || gymMonthlyFee || null;
  const trainerFee = gym?.trainerFee || gymTrainerFee || null;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "user_id, full_name, email, phone, join_date, created_at, membership_status, membership_type, account_status, admin_approved, avatar_url, preferred_trainer_id",
    )
    .eq("gym_owner_id", gymOwnerId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userIds = (profiles || []).map((p) => p.user_id).filter(Boolean);
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const rolesByUser = new Map<string, string[]>();
  for (const row of roleRows || []) {
    const list = rolesByUser.get(row.user_id) || [];
    list.push(row.role);
    rolesByUser.set(row.user_id, list);
  }

  const now = new Date();
  const members = (profiles || [])
    .filter((p) => {
      const row = p as Record<string, unknown>;
      const roles = rolesByUser.get(p.user_id) || [];
      const isCustomer =
        roles.length === 0 ||
        (roles.includes("user") &&
          !roles.some((r) =>
            ["admin", "trainer", "staff", "moderator"].includes(r),
          ));
      if (!isCustomer) return false;

      const membershipStatus = String(p.membership_status || "").toLowerCase();
      const accountStatus = String(row.account_status || "").toLowerCase();
      const approved = row.admin_approved === true;
      const isPending =
        !approved ||
        membershipStatus === "pending" ||
        accountStatus === "pending" ||
        membershipStatus === "rejected" ||
        accountStatus === "rejected";
      return !isPending;
    })
    .map((p) => {
      const row = p as Record<string, unknown>;
      const associatedAt =
        (typeof p.join_date === "string" && p.join_date) ||
        (typeof p.created_at === "string" && p.created_at) ||
        null;
      const period = monthlyPeriod(associatedAt, now);
      const status = String(
        p.membership_status || row.account_status || "active",
      ).toLowerCase();
      const preferredTrainerId =
        (row.preferred_trainer_id as string | null) || null;
      const hasTrainer = Boolean(preferredTrainerId);
      const monthlyFee = formatCombinedFee(
        baseMonthlyFee,
        trainerFee,
        hasTrainer,
      );

      return {
        userId: p.user_id,
        fullName: p.full_name || "Member",
        email: p.email || null,
        phone: p.phone || null,
        avatarUrl: (row.avatar_url as string | null) || null,
        membershipStatus: status,
        membershipType: p.membership_type || "basic",
        monthlyFee,
        gymMonthlyFee: baseMonthlyFee,
        trainerFee,
        hasTrainer,
        preferredTrainerId,
        associatedAt,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        daysLeft: period.daysLeft,
      };
    });

  return NextResponse.json({
    monthlyFee: baseMonthlyFee,
    trainerFee,
    gymName: gym?.gymName || null,
    members,
  });
}
