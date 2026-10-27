import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { fetchGymByOwnerId } from "@/lib/gyms/catalog";
import { formatMemberFee } from "@/lib/fees";
import { monthlyPeriod } from "@/lib/billing-period";
import {
  cacheAside,
  apiCacheKey,
  CacheTTL,
  withCacheHeaders,
} from "@/lib/api-cache";

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
    .select("admin_approved, is_super_admin, email, gym_owner_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true;

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
    gymMonthlyFee: null as string | null,
    gymTrainerFee: null as string | null,
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
  const cacheKey = apiCacheKey("admin-monthly-members", gymOwnerId);

  const { data, hit } = await cacheAside(
    cacheKey,
    CacheTTL.adminList,
    async () => {
      const gym = await fetchGymByOwnerId(supabase as never, gymOwnerId);
      const baseMonthlyFee =
        (gym?.monthly_fee != null ? String(gym.monthly_fee) : null) ||
        gymMonthlyFee ||
        null;
      const trainerFee =
        (gym?.trainer_fee != null ? String(gym.trainer_fee) : null) ||
        gymTrainerFee ||
        null;

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(
          "user_id, full_name, email, phone, join_date, created_at, membership_status, membership_type, account_status, admin_approved, avatar_url, preferred_trainer_id, pending_trainer_id, trainer_request_pending, fee_concession",
        )
        .eq("gym_owner_id", gymOwnerId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
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
          const feeConcession = (row.fee_concession as string | null) || null;
          const trainerRequestPending = row.trainer_request_pending === true;
          const pendingTrainerId = (row.pending_trainer_id as string | null) || null;
          const monthlyFee = formatMemberFee(
            baseMonthlyFee,
            trainerFee,
            hasTrainer,
            feeConcession,
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
            pendingTrainerId,
            trainerRequestPending,
            feeConcession,
            associatedAt,
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
            daysLeft: period.daysLeft,
          };
        });

      return {
        monthlyFee: baseMonthlyFee,
        trainerFee,
        gymName: gym?.name || null,
        members,
      };
    }
  );

  return NextResponse.json(
    data,
    withCacheHeaders(undefined, Math.floor(CacheTTL.adminList / 1000), hit),
  );
}
