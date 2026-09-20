import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { monthlyPeriod } from "@/lib/billing-period";
import { getGymByOwnerId } from "@/lib/gyms";
import { formatMemberFee } from "@/lib/fees";
import { jsonError } from "@/lib/api/errors";
import {
  cacheGetOrSet,
  CacheTTL,
  withCacheHeaders,
} from "@/lib/api-cache";

/** GET /api/membership/me — current member fee cycle + due status */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { data: payload, hit } = await cacheGetOrSet(
    `membership:me:${auth.user.id}`,
    CacheTTL.adminList,
    async () => {
      const service = createSupabaseServiceClient();
      const db = service || auth.supabase;

      const { data: profile } = await db
        .from("profiles")
        .select(
          "join_date, created_at, membership_status, membership_type, gym_owner_id, preferred_trainer_id, pending_trainer_id, trainer_request_pending, fee_concession, admin_approved",
        )
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (!profile?.gym_owner_id) {
        return {
          hasGym: false,
          daysLeft: null as number | null,
          periodEnd: null as string | null,
          feeLabel: null as string | null,
          dueSoon: false,
          overdue: false,
          membershipStatus: profile?.membership_status || null,
          preferredTrainerId: null as string | null,
          pendingTrainerId: null as string | null,
          trainerRequestPending: false,
          feeConcession: null as string | null,
          hasTrainer: false,
        };
      }

      const gym = await getGymByOwnerId(profile.gym_owner_id);
      const period = monthlyPeriod(
        profile.join_date,
        new Date(),
        profile.created_at,
      );
      const daysLeft = period.daysLeft;
      const dueSoon = daysLeft !== null && daysLeft <= 7;
      const overdue = daysLeft === 0 && (period.msLeft ?? 0) === 0;
      const preferredTrainerId =
        (profile.preferred_trainer_id as string | null) || null;
      const hasTrainer = Boolean(preferredTrainerId);
      const feeConcession =
        ((profile as { fee_concession?: string | null }).fee_concession as
          | string
          | null) || null;
      const trainerRequestPending =
        (profile as { trainer_request_pending?: boolean }).trainer_request_pending ===
        true;
      const pendingTrainerId =
        ((profile as { pending_trainer_id?: string | null }).pending_trainer_id as
          | string
          | null) || null;

      return {
        hasGym: true,
        gymName: gym?.gymName || null,
        gymOwnerId: profile.gym_owner_id,
        daysLeft,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        joinedAt: period.joinedAt,
        feeLabel: formatMemberFee(
          gym?.monthlyFee ?? null,
          gym?.trainerFee ?? null,
          hasTrainer,
          feeConcession,
        ),
        gymMonthlyFee: gym?.monthlyFee ?? null,
        trainerFee: gym?.trainerFee ?? null,
        hasTrainer,
        preferredTrainerId,
        pendingTrainerId,
        trainerRequestPending,
        feeConcession,
        dueSoon,
        overdue,
        membershipStatus: profile.membership_status,
        membershipType: profile.membership_type,
        approved: profile.admin_approved === true,
      };
    },
  );

  return NextResponse.json(
    payload,
    withCacheHeaders(undefined, Math.floor(CacheTTL.adminList / 1000), hit),
  );
}
