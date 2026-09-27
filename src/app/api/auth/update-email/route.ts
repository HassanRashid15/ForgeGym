import { NextResponse } from "next/server";
import {
  createSupabaseCookieClient,
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";

/**
 * POST /api/auth/update-email
 * Requires an authenticated session (Bearer/cookie), OR currentEmail + password
 * to prove account ownership (verification-page flow before email confirm).
 * Never updates by email alone.
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "auth:update-email"), 5, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "update-email", requestId });
    return rateLimitedResponse(limited);
  }

  const body = await request.json().catch(() => null);
  const newEmail = String(body?.email || "")
    .trim()
    .toLowerCase();
  const currentEmail = String(body?.currentEmail || "")
    .trim()
    .toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";

  if (!newEmail) {
    return jsonError("New email is required", 400, { requestId });
  }

  if (!/\S+@\S+\.\S+/.test(newEmail)) {
    return jsonError("Invalid email format", 400, { requestId });
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return jsonError("Server misconfigured", 500, { requestId });
  }

  let userId: string | null = null;
  let authEmail: string | null = null;

  // Prefer authenticated session
  const auth = await requireAuth(request);
  if (!("error" in auth)) {
    userId = auth.user.id;
    authEmail = (auth.user.email || "").toLowerCase() || null;
  } else if (currentEmail && password) {
    // Ownership proof for unverified signup / verification page (no session kept after register)
    const cookieClient = await createSupabaseCookieClient();
    const { data, error } = await cookieClient.auth.signInWithPassword({
      email: currentEmail,
      password,
    });

    if (error || !data.user) {
      return jsonError("Invalid email or password", 401, { requestId });
    }

    userId = data.user.id;
    authEmail = (data.user.email || currentEmail).toLowerCase();

    // Do not leave a lingering session from this proof step
    try {
      await cookieClient.auth.signOut();
    } catch {
      // ignore
    }
  } else {
    return jsonError("Authentication required", 401, {
      hint: "Sign in, or provide currentEmail and password to prove ownership.",
      requestId,
    });
  }

  if (!userId) {
    return jsonError("Authentication required", 401, { requestId });
  }

  const fromEmail = authEmail || currentEmail;
  if (fromEmail && newEmail === fromEmail) {
    return jsonError("New email must be different from current email", 400, { requestId });
  }

  // If client sent currentEmail, it must match the authenticated account
  if (currentEmail && authEmail && currentEmail !== authEmail) {
    return jsonError("Current email does not match this account", 403, { requestId });
  }

  // Conflict check (profiles). Auth uniqueness is enforced by Supabase update.
  const { data: existingProfile } = await service
    .from("profiles")
    .select("user_id")
    .eq("email", newEmail)
    .maybeSingle();

  if (existingProfile && existingProfile.user_id !== userId) {
    return jsonError("This email is already associated with another account", 409, {
      requestId,
    });
  }

  const previousEmail = authEmail;
  const { error: authError } = await service.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: false,
  });

  if (authError) {
    return jsonError(authError.message || "Failed to update auth email", 500, { requestId });
  }

  const { error: profileError } = await service
    .from("profiles")
    .update({
      email: newEmail,
      is_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (profileError) {
    if (previousEmail) {
      await service.auth.admin.updateUserById(userId, { email: previousEmail }).catch(() => null);
    }
    return jsonError("Failed to update profile email", 500, { requestId });
  }

  // Best-effort: send confirmation to the new address
  try {
    const cookieClient = await createSupabaseCookieClient();
    await cookieClient.auth.resend({
      type: "signup",
      email: newEmail,
    });
  } catch {
    // ignore — user can hit resend on verification page
  }

  trackEvent("auth.email_updated", { userId, requestId });

  return NextResponse.json({
    success: true,
    email: newEmail,
    userId,
    note: "Email updated. Re-verification required.",
  });
}
