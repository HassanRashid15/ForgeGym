import { NextResponse } from "next/server";
import {
  createSupabaseCookieClient,
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";
import { notify } from "@/lib/notify-actions";

/** POST /api/auth/login */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "auth:login"), 10, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "login", requestId });
    return rateLimitedResponse(limited);
  }

  const body = await request.json().catch(() => null);
  const email = body?.email?.trim()?.toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return jsonError("Email and password are required", 400, { requestId });
  }

  // Cookie client so successful login persists httpOnly-friendly SSR cookies
  const cookieClient = await createSupabaseCookieClient();
  const { data, error } = await cookieClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    trackEvent("auth.login_failed", { requestId });
    return jsonError(error?.message || "Login failed", 401, { requestId });
  }

  const userId = data.user.id;
  const service = createSupabaseServiceClient();
  const supabase = service || createSupabaseServerClient(data.session?.access_token);

  const { data: accessProfile } = await supabase
    .from("profiles")
    .select(
      "login_enabled, admin_approved, gym_owner_id, is_verified, is_super_admin, join_date, created_at, membership_type, trial_offered, trial_ends_at, is_frozen, frozen_until",
    )
    .eq("user_id", userId)
    .maybeSingle();

  // App-level gate: must verify email (profiles.is_verified) before login
  if (!data.user.email_confirmed_at || accessProfile?.is_verified !== true) {
    await cookieClient.auth.signOut();
    return jsonError("Email not confirmed", 403, {
      code: "email_not_confirmed",
      requestId,
    });
  }

  if ((accessProfile as { login_enabled?: boolean | null } | null)?.login_enabled === false) {
    await cookieClient.auth.signOut();
    return jsonError("This staff account does not have login access", 403, {
      code: "login_disabled",
      requestId,
    });
  }

  // Check if account is frozen
  const isFrozen = (accessProfile as { is_frozen?: boolean | null } | null)?.is_frozen === true;
  const frozenUntil = (accessProfile as { frozen_until?: string | null } | null)?.frozen_until;

  if (isFrozen) {
    // Check if the freeze has expired (if frozen_until is set)
    if (frozenUntil) {
      const frozenUntilDate = new Date(frozenUntil);
      const now = new Date();
      if (now >= frozenUntilDate) {
        // Auto-unfreeze: the freeze period has passed
        if (service) {
          await service
            .from("profiles")
            .update({ is_frozen: false, frozen_until: null })
            .eq("user_id", userId);
        }
      } else {
        // Still frozen, deny login
        await cookieClient.auth.signOut();
        return jsonError("Your account is frozen. Please contact your gym administrator.", 403, {
          code: "account_frozen",
          requestId,
        });
      }
    } else {
      // Manually frozen, deny login
      await cookieClient.auth.signOut();
      return jsonError("Your account is frozen. Please contact your gym administrator.", 403, {
        code: "account_frozen",
        requestId,
      });
    }
  }

  // Check if visitor trial has expired
  const trialOffered = (accessProfile as { trial_offered?: boolean | null } | null)?.trial_offered === true;
  const trialEndsAt = (accessProfile as { trial_ends_at?: string | null } | null)?.trial_ends_at;

  if (trialOffered && trialEndsAt) {
    const trialEndDate = new Date(trialEndsAt);
    const now = new Date();
    if (now > trialEndDate) {
      await cookieClient.auth.signOut();
      return jsonError("Your trial period has expired. Please contact gym admin to convert to a member.", 403, {
        code: "trial_expired",
        requestId,
      });
    }
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roleNames = (roleRows || []).map((r) => r.role);
  let role: string | undefined;
  if (roleNames.includes("admin")) role = "admin";
  else if (roleNames.includes("trainer")) role = "trainer";
  else if (roleNames.includes("staff")) role = "staff";
  else if (roleNames.includes("moderator")) role = "moderator";
  else if (roleNames.includes("user")) role = "user";
  else role = roleNames[0];

  // Same ownership rules as /api/auth/me — never promote on gym_name alone.
  // Members often carry a display gym_name while gym_owner_id points at the owner.
  if (!role || role === "user") {
    const metaRequested = String(
      (data.user.user_metadata as { requested_role?: string } | null)?.requested_role || "",
    ).toLowerCase();
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("gym_name, gym_owner_id")
      .eq("user_id", userId)
      .maybeSingle();

    const typedOwner = ownerProfile as {
      gym_name?: string | null;
      gym_owner_id?: string | null;
    } | null;

    const ownsOwnGymProfile =
      Boolean(typedOwner?.gym_name?.trim()) &&
      (!typedOwner?.gym_owner_id || typedOwner.gym_owner_id === userId);

    const looksLikeGymOwnerSignup =
      metaRequested === "admin" && ownsOwnGymProfile;

    if (looksLikeGymOwnerSignup) {
      role = "admin";
      if (service) {
        await service.from("user_roles").upsert(
          { user_id: userId, role: "admin" } as never,
          { onConflict: "user_id,role" },
        );
      }
    }
  }

  const gymOwnerId = (accessProfile as { gym_owner_id?: string | null } | null)?.gym_owner_id;
  const isApproved = accessProfile?.admin_approved === true;

  if (role === "admin" && !isApproved) {
    await cookieClient.auth.signOut();
    return jsonError("Your admin account is pending platform owner approval", 403, {
      code: "admin_approval_pending",
      requestId,
    });
  }

  if (role === "user" && gymOwnerId && !isApproved) {
    await cookieClient.auth.signOut();
    return jsonError("Your membership is pending gym admin approval", 403, {
      code: "member_approval_pending",
      requestId,
    });
  }

  trackEvent("auth.login", { userId, requestId });

  void notify.loginSuccess(userId, new Date().toLocaleString());

  // Auto-subscribe members & gym admins (not superadmin) to newsletter
  const loginEmail = (data.user.email || email || "").toLowerCase();
  const isSuperAdminUser =
    accessProfile?.is_super_admin === true || email === "superadmin@forge.test";

  if (loginEmail && !isSuperAdminUser) {
    const { subscribeEmail } = await import("@/lib/newsletter");
    void subscribeEmail(loginEmail).catch(() => null);
  }

  // Fee / renewal reminder when ≤7 days left in billing cycle
  if (
    role === "user" &&
    !isSuperAdminUser &&
    accessProfile?.gym_owner_id &&
    accessProfile?.admin_approved === true
  ) {
    const { monthlyPeriod } = await import("@/lib/billing-period");
    const { membershipTemplates, sendTemplatedNotification } = await import(
      "@/lib/notification-templates"
    );
    const period = monthlyPeriod(
      (accessProfile as { join_date?: string | null }).join_date ||
        (accessProfile as { created_at?: string | null }).created_at,
    );
    if (period.daysLeft !== null && period.daysLeft <= 7 && period.periodEnd) {
      const plan =
        (accessProfile as { membership_type?: string | null }).membership_type ||
        "membership";
      void sendTemplatedNotification(
        userId,
        membershipTemplates.renewal(
          plan,
          new Date(period.periodEnd).toLocaleDateString(),
        ),
      ).catch(() => null);
    }
  }

  return NextResponse.json({
    user: data.user,
    session: data.session,
  });
}
