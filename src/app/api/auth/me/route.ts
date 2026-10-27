import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { computeTrialInfo, trialActivationPatch } from "@/lib/admin-trial";
import { cacheAside, apiCacheKey, CacheTTL, withCacheHeaders } from "@/lib/api-cache";

/** GET /api/auth/me — role + profile (self-heals missing admin role for gym owners) */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user } = auth;
  const cacheKey = apiCacheKey("auth-me", user.id);

  // Use server-side cache to reduce redundant calls
  const { data, hit } = await cacheAside(
    cacheKey,
    CacheTTL.authUser,
    async () => {
      return await fetchMeData(auth);
    }
  );

  return NextResponse.json(data, withCacheHeaders(undefined, 0, hit));
}

async function fetchMeData(auth: { user: any; supabase: any }) {
  const { user, supabase } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const [{ data: roles }, { data: profile }, { data: ownGym }] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", user.id),
    db.from("profiles")
      .select(
        "full_name, email, admin_approved, avatar_url, is_super_admin, is_verified, gym_owner_id, membership_status, membership_type, is_visitor, trial_offered, trial_starts_at, trial_ends_at, platform_monthly_fee, platform_fee_status, feature_classes_enabled, feature_schedule_enabled, feature_membership_enabled",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    db.from("gyms")
      .select("name, city, gym_type, main_image_url")
      .eq("owner_user_id", user.id)
      .maybeSingle(),
  ]);

  const roleNames = (roles || []).map((r: { role: string }) => r.role);
  let role: "admin" | "moderator" | "customer" | "trainer" | "staff" = "customer";
  if (roleNames.includes("admin")) role = "admin";
  else if (roleNames.includes("trainer")) role = "trainer";
  else if (roleNames.includes("staff")) role = "staff";
  else if (roleNames.includes("moderator")) role = "moderator";

  const email = (profile?.email || user.email || "").toLowerCase();
  const isSuperAdmin = (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true;

  const profileRow = profile as {
    gym_owner_id?: string | null;
    avatar_url?: string | null;
    membership_status?: string | null;
    membership_type?: string | null;
    admin_approved?: boolean | null;
    is_verified?: boolean | null;
    is_visitor?: boolean | null;
    trial_offered?: boolean | null;
    trial_starts_at?: string | null;
    trial_ends_at?: string | null;
    feature_classes_enabled?: boolean | null;
    feature_schedule_enabled?: boolean | null;
    feature_membership_enabled?: boolean | null;
  } | null;

  const metaRequested = String(
    (user.user_metadata as { requested_role?: string } | null)?.requested_role || "",
  ).toLowerCase();

  // Heal true gym-owner signups missing a user_roles row.
  // Ownership = gyms row for this user OR meta admin + own gym_owner_id — never inherit via linked gym.
  const ownsOwnGym =
    Boolean(ownGym?.name?.trim()) ||
    (profileRow?.gym_owner_id != null && profileRow.gym_owner_id === user.id);
  const looksLikeGymOwnerSignup =
    metaRequested === "admin" && ownsOwnGym;

  if (role === "customer" && (isSuperAdmin || looksLikeGymOwnerSignup)) {
    role = "admin";
    if (service && !roleNames.includes("admin")) {
      const { error: healErr } = await service.from("user_roles").upsert(
        { user_id: user.id, role: "admin" },
        { onConflict: "user_id,role" },
      );
      if (healErr) {
        console.warn("me: could not self-heal admin role:", healErr.message);
      }
    }
  }

  const gymOwnerId =
    profileRow?.gym_owner_id || (role === "admin" ? user.id : null);

  let gymName = ownGym?.name || null;
  let gymCity = ownGym?.city || null;
  let gymType = ownGym?.gym_type || null;
  let gymMainImageUrl: string | null = ownGym?.main_image_url || null;
  let featureClassesEnabled = profileRow?.feature_classes_enabled === true;
  let featureScheduleEnabled = profileRow?.feature_schedule_enabled === true;
  let featureMembershipEnabled = profileRow?.feature_membership_enabled === true;

  if (gymOwnerId && service && gymOwnerId !== user.id) {
    const [{ data: gymRow }, { data: ownerProfile }] = await Promise.all([
      service
        .from("gyms")
        .select("name, city, gym_type, main_image_url")
        .eq("owner_user_id", gymOwnerId)
        .maybeSingle(),
      service
        .from("profiles")
        .select(
          "feature_classes_enabled, feature_schedule_enabled, feature_membership_enabled",
        )
        .eq("user_id", gymOwnerId)
        .maybeSingle(),
    ]);

    gymName = gymRow?.name || gymName;
    gymCity = gymRow?.city || gymCity;
    gymType = gymRow?.gym_type || gymType;
    gymMainImageUrl = gymRow?.main_image_url || gymMainImageUrl;

    if (ownerProfile) {
      featureClassesEnabled = ownerProfile.feature_classes_enabled === true;
      featureScheduleEnabled = ownerProfile.feature_schedule_enabled === true;
      featureMembershipEnabled = ownerProfile.feature_membership_enabled === true;
    }
  } else if (role === "admin" && ownGym) {
    gymName = ownGym.name || gymName;
    gymCity = ownGym.city || gymCity;
    gymType = ownGym.gym_type || gymType;
    gymMainImageUrl = ownGym.main_image_url || gymMainImageUrl;
  }

  const approved = isSuperAdmin || profile?.admin_approved === true;
  const isPlatformMember =
    !isSuperAdmin &&
    role === "customer" &&
    approved &&
    !gymOwnerId;

  // Heal: fee accepted earlier but access month never written
  let trialStartsAt = profileRow?.trial_starts_at || null;
  let trialEndsAt = profileRow?.trial_ends_at || null;
  let trialOffered = profileRow?.trial_offered === true;
  const feeStatus = (
    profileRow as { platform_fee_status?: string | null } | null
  )?.platform_fee_status;
  if (
    isPlatformMember &&
    feeStatus === "accepted" &&
    (!trialStartsAt || !trialEndsAt) &&
    service
  ) {
    const patch = trialActivationPatch();
    const { data: healed } = await service
      .from("profiles")
      .update({
        ...patch,
        account_status: "active",
        membership_status: "active",
        is_frozen: false,
        frozen_until: null,
        freeze_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .select("trial_offered, trial_starts_at, trial_ends_at")
      .maybeSingle();
    if (healed) {
      trialOffered = healed.trial_offered === true;
      trialStartsAt = healed.trial_starts_at || null;
      trialEndsAt = healed.trial_ends_at || null;
    }
  }

  const trial = computeTrialInfo({
    isSuperAdmin,
    isGymOwnerAdmin: role === "admin" && !isSuperAdmin,
    isPlatformMember,
    adminApproved: approved,
    trialOffered: trialOffered || feeStatus === "pending_acceptance",
    trialStartsAt,
    trialEndsAt,
  });

  return {
    id: user.id,
    email: profile?.email || user.email,
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      email.split("@")[0],
    role,
    isSuperAdmin,
    admin_approved: approved,
    is_verified: isSuperAdmin || profileRow?.is_verified === true,
    isVisitor: profileRow?.is_visitor === true,
    avatar: profileRow?.avatar_url || user.user_metadata?.avatar_url || null,
    gymName,
    gymOwnerId,
    gymCity,
    gymType,
    gymMainImageUrl,
    membershipStatus: profileRow?.membership_status || null,
    membershipType: profileRow?.membership_type || null,
    featureClassesEnabled,
    featureScheduleEnabled,
    featureMembershipEnabled,
    platformFeeStatus: feeStatus || null,
    platformMonthlyFee:
      (profileRow as { platform_monthly_fee?: string | null } | null)
        ?.platform_monthly_fee || null,
    trial,
  };
}
