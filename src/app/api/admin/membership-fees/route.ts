import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { cacheInvalidate } from "@/lib/api-cache";
import { computeTrialInfo } from "@/lib/admin-trial";
import { notify } from "@/lib/notify-actions";

async function requireSuperAdmin(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const { supabase, user } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const { data: profile } = await db
    .from("profiles")
    .select("is_super_admin, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const email = (profile?.email || user.email || "").toLowerCase();
  const isSuperAdmin =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true ||
    email === "superadmin@forge.test";

  if (!isSuperAdmin) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — super admin only" },
        { status: 403 },
      ),
    };
  }

  return { supabase: db, user };
}

export type MembershipFeeAdmin = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  gym_name: string | null;
  gym_city: string | null;
  admin_approved: boolean;
  platform_monthly_fee: string | null;
  trial_status: string;
  trial_ends_at: string | null;
  trial_starts_at: string | null;
  trial_days_left: number | null;
};

/** GET /api/admin/membership-fees — approved gym owners + assigned monthly fees */
export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase } = auth;

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (rolesError) {
    return NextResponse.json({ error: rolesError.message }, { status: 400 });
  }

  const adminIds = Array.from(new Set((roles || []).map((r) => r.user_id)));
  if (adminIds.length === 0) {
    return NextResponse.json({ admins: [] as MembershipFeeAdmin[] });
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "user_id, full_name, email, gym_name, gym_city, admin_approved, is_super_admin, platform_monthly_fee, trial_offered, trial_starts_at, trial_ends_at",
    )
    .in("user_id", adminIds)
    .eq("admin_approved", true)
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const admins: MembershipFeeAdmin[] = (profiles || [])
    .filter((p) => (p as { is_super_admin?: boolean }).is_super_admin !== true)
    .map((p) => {
      const trial = computeTrialInfo({
        isGymOwnerAdmin: true,
        isSuperAdmin: false,
        adminApproved: true,
        trialOffered: p.trial_offered === true,
        trialStartsAt: p.trial_starts_at || null,
        trialEndsAt: p.trial_ends_at || null,
      });
      return {
        user_id: p.user_id as string,
        full_name: (p.full_name as string | null) ?? null,
        email: (p.email as string | null) ?? null,
        gym_name: (p.gym_name as string | null) ?? null,
        gym_city: (p.gym_city as string | null) ?? null,
        admin_approved: true,
        platform_monthly_fee:
          ((p as { platform_monthly_fee?: string | null }).platform_monthly_fee ||
            null) as string | null,
        trial_status: trial.status,
        trial_ends_at: trial.endsAt,
        trial_starts_at: trial.startsAt,
        trial_days_left: trial.daysLeft,
      };
    });

  return NextResponse.json({ admins });
}

/** PATCH /api/admin/membership-fees — set per-admin platform monthly fee */
export async function PATCH(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase } = auth;
  const body = (await request.json().catch(() => null)) as {
    userId?: string;
    platformMonthlyFee?: string | null;
  } | null;

  const userId = String(body?.userId || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const raw = body?.platformMonthlyFee;
  const fee =
    raw === null || raw === undefined ? null : String(raw).trim() || null;

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("user_id, is_super_admin, admin_approved, full_name, gym_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (targetError || !target) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  if ((target as { is_super_admin?: boolean }).is_super_admin === true) {
    return NextResponse.json(
      { error: "Cannot set membership fee on super admin" },
      { status: 400 },
    );
  }

  if (target.admin_approved !== true) {
    return NextResponse.json(
      { error: "Admin must be approved before setting a fee" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ platform_monthly_fee: fee })
    .eq("user_id", userId)
    .select(
      "user_id, full_name, email, gym_name, gym_city, platform_monthly_fee, trial_starts_at, trial_ends_at, trial_offered",
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message.includes("platform_monthly_fee") || error.code === "42703"
            ? "Run migration 20260320_platform_monthly_fee.sql first"
            : error.message,
      },
      { status: 400 },
    );
  }

  cacheInvalidate("admin:pending:");
  cacheInvalidate("settings:platform_facility_fee");

  const feeLabel = fee ? `$${fee}` : null;
  void notify.platformFeeUpdated(userId, feeLabel);

  return NextResponse.json({
    admin: {
      user_id: data?.user_id,
      full_name: data?.full_name ?? null,
      email: data?.email ?? null,
      gym_name: data?.gym_name ?? null,
      gym_city: data?.gym_city ?? null,
      platform_monthly_fee: data?.platform_monthly_fee || null,
    },
  });
}
