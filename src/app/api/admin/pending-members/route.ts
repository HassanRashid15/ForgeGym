import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import {
  trialRenewalPatch,
  membershipTrialRenewalPatch,
  type TrialRenewalPatch,
  type MembershipTrialRenewalPatch,
} from "@/lib/admin-trial";
import {
  cacheAside,
  apiCacheKey,
  CacheTTL,
  withCacheHeaders,
  cacheInvalidate,
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
  const { data: gymRow } = await db
    .from("gyms")
    .select("name, city")
    .eq("owner_user_id", gymOwnerId)
    .maybeSingle();

  return {
    supabase: service,
    user,
    isSuperAdmin,
    gymOwnerId,
    gymName: (gymRow as { name?: string | null } | null)?.name || null,
    gymCity: (gymRow as { city?: string | null } | null)?.city || null,
  };
}

/** GET /api/admin/pending-members — Get pending members for approval (optimized for polling) */
export async function GET(request: Request) {
  const auth = await requireApprovedAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase, gymOwnerId } = auth;
  const cacheKey = apiCacheKey("admin-pending-members", gymOwnerId);

  const { data, hit } = await cacheAside(
    cacheKey,
    CacheTTL.adminList,
    async () => {
      // Query for pending members - users who need admin approval
      // Also include frozen accounts due to trial expiration
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("gym_owner_id", gymOwnerId)
        .or(`and(admin_approved.eq.false,approval_requested_at.not.is.null),and(is_frozen.eq.true,freeze_reason.eq.trial_expiration)`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      const userIds = (profiles || []).map((p) => p.user_id).filter(Boolean);

      // Get roles for these users
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

      const rolesByUser = new Map<string, string>();
      for (const row of roleRows || []) {
        rolesByUser.set(row.user_id, row.role);
      }

      // Filter to only show users (not staff/trainers/admins)
      const pendingMembers = (profiles || [])
        .filter((p) => rolesByUser.get(p.user_id) === "user")
        .map((p) => ({
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
          avatar_url: p.avatar_url,
          created_at: p.created_at,
          account_status: p.account_status,
          membership_type: p.membership_type,
          is_frozen: p.is_frozen === true,
          freeze_reason: p.freeze_reason || null,
          frozen_until: p.frozen_until || null,
          trial_ends_at: p.trial_ends_at || null,
          membership_trial_ends_at: p.membership_trial_ends_at || null,
        }));

      return {
        pendingMembers,
        count: pendingMembers.length,
        timestamp: new Date().toISOString(),
      };
    }
  );

  return NextResponse.json(
    data,
    withCacheHeaders(undefined, Math.floor(CacheTTL.adminList / 1000), hit),
  );
}

/**
 * POST /api/admin/pending-members
 * Approve, reject, or renew pending members
 */
export async function POST(request: Request) {
  const auth = await requireApprovedAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase, gymOwnerId } = auth;
  const body = await request.json();
  const { userId, action, trialType } = body;

  if (!userId || !action) {
    return NextResponse.json(
      { error: "Missing userId or action" },
      { status: 400 },
    );
  }

  if (action !== "approve" && action !== "reject" && action !== "renew") {
    return NextResponse.json(
      { error: "Invalid action. Must be approve, reject, or renew" },
      { status: 400 },
    );
  }

  // Get the member's profile to check current state
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 },
    );
  }

  // Verify this member belongs to the admin's gym
  if (profile.gym_owner_id !== gymOwnerId) {
    return NextResponse.json(
      { error: "Forbidden — member does not belong to your gym" },
      { status: 403 },
    );
  }

  const now = new Date();

  if (action === "renew") {
    // Renew trial for frozen accounts
    if (!profile.is_frozen || profile.freeze_reason !== "trial_expiration") {
      return NextResponse.json(
        { error: "Can only renew accounts frozen due to trial expiration" },
        { status: 400 },
      );
    }

    // Determine which trial to renew based on trialType or what was active before
    const isMembershipTrial = trialType === "membership" || profile.membership_trial_ends_at;
    const renewalPatch = isMembershipTrial
      ? membershipTrialRenewalPatch(now)
      : trialRenewalPatch(now);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        ...renewalPatch,
        admin_approved: true,
        membership_status: "active",
        account_status: "active",
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 },
      );
    }

    // Invalidate cache
    await cacheInvalidate({ prefixes: ["api-cache:admin-pending-members:"] });

    return NextResponse.json({
      success: true,
      message: "Trial renewed successfully",
      trialEndsAt: isMembershipTrial
        ? (renewalPatch as MembershipTrialRenewalPatch).membership_trial_ends_at
        : (renewalPatch as TrialRenewalPatch).trial_ends_at,
    });
  }

  if (action === "approve") {
    // Standard approval for new pending members
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        admin_approved: true,
        approval_requested_at: null,
        membership_status: "active",
        account_status: "active",
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 },
      );
    }

    // Invalidate cache
    await cacheInvalidate({ prefixes: ["api-cache:admin-pending-members:"] });

    return NextResponse.json({
      success: true,
      message: "Member approved successfully",
    });
  }

  if (action === "reject") {
    // Reject pending member
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        admin_approved: false,
        admin_rejected_at: now.toISOString(),
        approval_requested_at: null,
        membership_status: "rejected",
        account_status: "rejected",
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 },
      );
    }

    // Invalidate cache
    await cacheInvalidate({ prefixes: ["api-cache:admin-pending-members:"] });

    return NextResponse.json({
      success: true,
      message: "Member rejected successfully",
    });
  }
}