import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { monthlyPeriod } from "@/lib/billing-period";
import { getGymByOwnerId } from "@/lib/gyms";
import { formatCombinedFee } from "@/lib/fees";
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
          "join_date, created_at, membership_status, membership_type, gym_owner_id, preferred_trainer_id, admin_approved",
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
        };
      }

      const gym = await getGymByOwnerId(profile.gym_owner_id);
      const period = monthlyPeriod(profile.join_date || profile.created_at);
      const daysLeft = period.daysLeft;
      const dueSoon = daysLeft !== null && daysLeft <= 7;
      const overdue = daysLeft === 0;

      return {
        hasGym: true,
        gymName: gym?.gymName || null,
        gymOwnerId: profile.gym_owner_id,
        daysLeft,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        feeLabel: formatCombinedFee(
          gym?.monthlyFee ?? null,
          gym?.trainerFee ?? null,
          Boolean(profile.preferred_trainer_id),
        ),
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
