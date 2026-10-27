import { NextResponse } from "next/server";
import { createSupabaseServiceClient, requireAuth } from "@/lib/supabase/server";
import { notify } from "@/lib/notify-actions";
import {
  cacheGet,
  cacheSet,
  cacheInvalidate,
  withCacheHeaders,
} from "@/lib/api-cache";
import { trialActivationPatch, computeTrialInfo } from "@/lib/admin-trial";

async function requireSuperAdmin(request: Request) {
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
    .select("admin_approved, is_super_admin, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true;

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

type AdminProfile = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string | null;
  admin_approved: boolean | null;
  admin_rejected_at: string | null;
  is_verified: boolean | null;
  approval_requested_at: string | null;
  gym_name: string | null;
  gym_type: string | null;
  gym_city: string | null;
  gym_main_image_url: string | null;
  gym_avatar_url: string | null;
  gym_monthly_fee: string | null;
  gym_trainer_fee: string | null;
  platform_monthly_fee: string | null;
  is_super_admin: boolean | null;
  trial_offered: boolean | null;
  trial_starts_at: string | null;
  trial_ends_at: string | null;
};

function mapAdmin(
  p: AdminProfile,
  kind: "gym_owner" | "platform_member" = "gym_owner",
) {
  const approved = p.admin_approved === true;
  const rejected = !approved && !!p.admin_rejected_at;
  const status = approved ? "approved" : rejected ? "rejected" : "pending";
  const trial = computeTrialInfo({
    isGymOwnerAdmin: kind === "gym_owner",
    isSuperAdmin: p.is_super_admin === true,
    adminApproved: approved,
    trialOffered:
      kind === "gym_owner"
        ? p.trial_offered === true || status !== "rejected"
        : false,
    trialStartsAt: p.trial_starts_at || null,
    trialEndsAt: p.trial_ends_at || null,
  });

  return {
    user_id: p.user_id,
    full_name: p.full_name ?? null,
    email: p.email ?? null,
    phone: p.phone ?? null,
    avatar_url: p.avatar_url || p.gym_avatar_url || p.gym_main_image_url || null,
    created_at: p.created_at ?? null,
    admin_approved: approved,
    admin_rejected_at: p.admin_rejected_at ?? null,
    is_verified: p.is_verified === true,
    approval_requested_at: p.approval_requested_at ?? null,
    gym_name: p.gym_name ?? null,
    gym_type: p.gym_type ?? null,
    gym_city: p.gym_city ?? null,
    gym_main_image_url: p.gym_main_image_url ?? null,
    gym_monthly_fee: p.gym_monthly_fee ?? null,
    gym_trainer_fee: p.gym_trainer_fee ?? null,
    status: status as "pending" | "approved" | "rejected",
    kind,
    trial_offered: trial.offered,
    trial_starts_at: trial.startsAt,
    trial_ends_at: trial.endsAt,
    trial_status: trial.status,
    trial_days_left: trial.daysLeft,
    trial_label: trial.label,
    platform_monthly_fee: p.platform_monthly_fee || null,
  };
}

/** GET /api/admin/pending — list pending, approved, and rejected gym-owner admins */
export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const cacheKey = `admin:pending:v4:${auth.user.id}`;
  const pendingTtlMs = 2_000;
  const cached = await cacheGet<Record<string, unknown>>(cacheKey);
  if (cached && Array.isArray(cached.admins)) {
    return NextResponse.json(
      cached,
      withCacheHeaders(undefined, Math.floor(pendingTtlMs / 1000), true),
    );
  }

  const { supabase } = auth;

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id, role");

  if (rolesError) {
    return NextResponse.json({ error: rolesError.message }, { status: 400 });
  }

  const adminIds = Array.from(
    new Set(
      (roles || [])
        .filter((r) => r.role === "admin")
        .map((r) => r.user_id)
        .filter(Boolean),
    ),
  );
  const adminIdSet = new Set(adminIds);

  // Also include previously rejected admins who may have been demoted (older reject flow)
  const { data: rejectedOnly } = await supabase
    .from("profiles")
    .select("user_id")
    .not("admin_rejected_at", "is", null)
    .eq("admin_approved", false);

  for (const row of rejectedOnly || []) {
    if (row.user_id && !adminIdSet.has(row.user_id)) {
      adminIds.push(row.user_id);
      adminIdSet.add(row.user_id);
    }
  }

  // Platform members (self-training): no gym, not super admin, not approved
  // Do not require a user_roles row — signup finalize can lag; still show for approval
  const { data: platformMemberRows } = await supabase
    .from("profiles")
    .select("user_id, admin_approved, admin_rejected_at")
    .is("gym_owner_id", null)
    .eq("is_super_admin", false);

  const platformMemberIds = Array.from(
    new Set(
      (platformMemberRows || [])
        .filter((r) => r.admin_approved !== true)
        .map((r) => r.user_id)
        .filter((id): id is string => !!id && !adminIdSet.has(id)),
    ),
  );

  const allIds = [...adminIds, ...platformMemberIds];

  if (allIds.length === 0) {
    return NextResponse.json({
      pending: [],
      approved: [],
      rejected: [],
      admins: [],
      notifications: [],
    });
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "user_id, full_name, email, phone, avatar_url, created_at, admin_approved, admin_rejected_at, is_verified, approval_requested_at, platform_monthly_fee, is_super_admin, trial_offered, trial_starts_at, trial_ends_at, gym_owner_id",
    )
    .in("user_id", allIds)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: gymRows } =
    adminIds.length > 0
      ? await supabase
          .from("gyms")
          .select(
            "owner_user_id, name, gym_type, city, main_image_url, avatar_url, monthly_fee, trainer_fee",
          )
          .in("owner_user_id", adminIds)
      : { data: [] as Array<{
          owner_user_id: string;
          name: string | null;
          gym_type: string | null;
          city: string | null;
          main_image_url: string | null;
          avatar_url: string | null;
          monthly_fee: number | null;
          trainer_fee: number | null;
        }> };

  const gymByOwner = new Map(
    (gymRows || []).map((g) => [g.owner_user_id, g] as const),
  );

  // Gym-owner admins + platform members — hide platform super admins
  const admins = (profiles || [])
    .filter((p) => (p as { is_super_admin?: boolean | null }).is_super_admin !== true)
    .map((p) => {
      const isPlatformMember =
        platformMemberIds.includes(p.user_id) ||
        (!(p as { gym_owner_id?: string | null }).gym_owner_id &&
          !adminIds.includes(p.user_id));
      const gym = gymByOwner.get(p.user_id);
      return mapAdmin(
        {
          ...(p as Omit<
            AdminProfile,
            | "gym_name"
            | "gym_type"
            | "gym_city"
            | "gym_main_image_url"
            | "gym_avatar_url"
            | "gym_monthly_fee"
            | "gym_trainer_fee"
          >),
          gym_name: isPlatformMember ? null : (gym?.name ?? null),
          gym_type: isPlatformMember ? null : (gym?.gym_type ?? null),
          gym_city: isPlatformMember ? null : (gym?.city ?? null),
          gym_main_image_url: isPlatformMember
            ? null
            : (gym?.main_image_url ?? null),
          gym_avatar_url: isPlatformMember ? null : (gym?.avatar_url ?? null),
          gym_monthly_fee:
            !isPlatformMember && gym?.monthly_fee != null
              ? String(gym.monthly_fee)
              : null,
          gym_trainer_fee:
            !isPlatformMember && gym?.trainer_fee != null
              ? String(gym.trainer_fee)
              : null,
        },
        isPlatformMember ? "platform_member" : "gym_owner",
      );
    });
  const pending = admins.filter((a) => a.status === "pending");
  const approved = admins.filter(
    (a) => a.status === "approved" && a.kind === "gym_owner",
  );
  const rejected = admins.filter((a) => a.status === "rejected");

  const { data: notifications } = await supabase
    .from("admin_notifications")
    .select("*")
    .eq("recipient_user_id", auth.user.id)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const payload = {
    pending,
    approved,
    rejected,
    admins,
    notifications: notifications || [],
  };
  await cacheSet(cacheKey, payload, pendingTtlMs);
  return NextResponse.json(
    payload,
    withCacheHeaders(undefined, Math.floor(pendingTtlMs / 1000), false),
  );
}

/** POST /api/admin/pending — approve or reject { userId, action } */
export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const body = await request.json().catch(() => null);
  const userId = body?.userId?.trim();
  const action = (body?.action === "reject" ? "reject" : "approve") as "approve" | "reject";

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json(
      { error: action === "reject" ? "Cannot reject yourself" : "Cannot approve yourself" },
      { status: 400 },
    );
  }

  const [{ data: targetProfile }, { data: targetGym }] = await Promise.all([
    supabase
      .from("profiles")
      .select("is_super_admin, email, gym_owner_id")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("gyms")
      .select("name")
      .eq("owner_user_id", userId)
      .maybeSingle(),
  ]);

  if (
    (targetProfile as { is_super_admin?: boolean } | null)?.is_super_admin === true
  ) {
    return NextResponse.json(
      { error: "Cannot modify a platform super admin" },
      { status: 400 },
    );
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = (roleRows || []).map((r) => r.role);
  const hasGymRecord = !!(targetGym as { name?: string | null } | null)?.name;
  let isGymOwnerAdmin = roles.includes("admin") || hasGymRecord;
  const isPlatformMember =
    !isGymOwnerAdmin &&
    roles.includes("user") &&
    !(targetProfile as { gym_owner_id?: string | null } | null)?.gym_owner_id;

  if (!isGymOwnerAdmin && !isPlatformMember) {
    return NextResponse.json(
      { error: "Target user is not awaiting platform approval" },
      { status: 400 },
    );
  }

  // Re-attach admin role when re-approving a gym owner after older demote-reject
  if (isGymOwnerAdmin && !roles.includes("admin") && action === "approve") {
    const { error: roleErr } = await supabase.from("user_roles").upsert(
      { user_id: userId, role: "admin" },
      { onConflict: "user_id,role" },
    );
    if (roleErr) {
      return NextResponse.json({ error: roleErr.message }, { status: 400 });
    }
    isGymOwnerAdmin = true;
  }

  if (action === "approve") {
    const hasFee = body?.platformMonthlyFee !== undefined;
    const platformFee = hasFee
      ? String(body.platformMonthlyFee ?? "").trim() || null
      : undefined;
    const feePatch =
      hasFee && platformFee
        ? {
            platform_monthly_fee: platformFee,
            platform_fee_status: "pending_acceptance",
            platform_fee_concession_amount: null,
            platform_fee_concession_note: null,
            platform_fee_responded_at: null,
          }
        : hasFee
          ? {
              platform_monthly_fee: null,
              platform_fee_status: null,
              platform_fee_concession_amount: null,
              platform_fee_concession_note: null,
              platform_fee_responded_at: null,
            }
          : {};

    if (isPlatformMember) {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          admin_approved: true,
          admin_rejected_at: null,
          approval_requested_at: null,
          is_super_admin: false,
          account_status: "active",
          membership_status: "active",
          ...feePatch,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select(
          "user_id, full_name, email, admin_approved, admin_rejected_at, platform_monthly_fee, platform_fee_status",
        )
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (!data) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      await supabase
        .from("admin_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("from_user_id", userId)
        .is("read_at", null);

      void notify.platformMemberApproved(userId);
      if (platformFee) {
        void notify.platformFeeUpdated(userId, `$${platformFee}`);
      }
      cacheInvalidate("admin:pending");
      cacheInvalidate("admin:users:");
      cacheInvalidate("settings:platform_facility_fee");

      return NextResponse.json({
        approved: data,
        action: "approve",
        kind: "platform_member",
        platformMonthlyFee: platformFee ?? null,
      });
    }

    // 1-month access starts when they accept the fee (not on approve)
    const startTrialNow = !platformFee;
    const trial = startTrialNow ? trialActivationPatch() : null;

    const { data, error } = await supabase
      .from("profiles")
      .update({
        admin_approved: true,
        admin_rejected_at: null,
        approval_requested_at: null,
        is_super_admin: false,
        account_status: "active",
        membership_status: "active",
        trial_offered: true,
        ...(trial
          ? {
              trial_starts_at: trial.trial_starts_at,
              trial_ends_at: trial.trial_ends_at,
            }
          : {
              trial_starts_at: null,
              trial_ends_at: null,
            }),
        ...feePatch,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select(
        "user_id, full_name, email, admin_approved, admin_rejected_at, trial_starts_at, trial_ends_at, platform_monthly_fee, platform_fee_status",
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Publish gym catalog when owner is approved
    await supabase
      .from("gyms")
      .update({ is_published: true, updated_at: new Date().toISOString() })
      .eq("owner_user_id", userId);
    if (!data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await supabase
      .from("admin_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("from_user_id", userId)
      .is("read_at", null);

    const gymName = (targetGym as { name?: string | null } | null)?.name || null;
    void notify.gymOwnerApproved(userId, gymName);

    if (platformFee) {
      void notify.platformFeeUpdated(userId, `$${platformFee}`);
    }

    try {
      const { createNotification } = await import("@/lib/notifications");
      if (trial) {
        await createNotification({
          user_id: userId,
          type: "welcome",
          title: "1-month free trial started",
          message: `Your gym is approved. Free trial runs until ${new Date(trial.trial_ends_at).toLocaleDateString()}.`,
          metadata: {
            related_id: userId,
            related_type: "trial",
            action_url: "/dashboard",
            priority: "high",
          },
        });
      } else if (platformFee) {
        await createNotification({
          user_id: userId,
          type: "welcome",
          title: "Gym approved — accept your fee",
          message: `Your gym is approved. Accept the $${platformFee}/mo platform fee on your dashboard to unlock 1 month of access.`,
          metadata: {
            related_id: userId,
            related_type: "trial",
            action_url: "/dashboard",
            priority: "high",
          },
        });
      }
    } catch {
      /* ignore */
    }

    cacheInvalidate("admin:pending");
    cacheInvalidate("admin:users:");
    cacheInvalidate("settings:platform_facility_fee");

    return NextResponse.json({
      approved: data,
      action: "approve",
      kind: "gym_owner",
      trial: trial
        ? {
            startsAt: trial.trial_starts_at,
            endsAt: trial.trial_ends_at,
          }
        : null,
      platformMonthlyFee:
        (data as { platform_monthly_fee?: string | null }).platform_monthly_fee ||
        null,
    });
  }

  // Reject
  const { data, error } = await supabase
    .from("profiles")
    .update({
      admin_approved: false,
      admin_rejected_at: new Date().toISOString(),
      approval_requested_at: null,
      account_status: "rejected",
      membership_status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("user_id, full_name, email, admin_approved, admin_rejected_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (isGymOwnerAdmin) {
    await supabase
      .from("gyms")
      .update({ is_published: false, updated_at: new Date().toISOString() })
      .eq("owner_user_id", userId);
  }

  await supabase
    .from("admin_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("from_user_id", userId)
    .is("read_at", null);

  if (isPlatformMember) {
    void notify.platformMemberRejected(userId);
  } else {
    void notify.gymOwnerRejected(userId);
  }

  cacheInvalidate("admin:pending");
  cacheInvalidate("admin:users:");

  return NextResponse.json({
    rejected: data,
    action: "reject",
    kind: isPlatformMember ? "platform_member" : "gym_owner",
  });
}
