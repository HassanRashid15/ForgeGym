import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";

/** GET /api/newsletter/check - Check if the authenticated user's email is subscribed. */
export async function GET(request: Request) {
  const requestId = getRequestId(request);

  const limited = await rateLimit(clientKey(request, "newsletter:check"), 30, 60_000);
  if (!limited.allowed) {
    return rateLimitedResponse(limited);
  }

  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim()?.toLowerCase();

  if (!email || !email.includes("@")) {
    return jsonError("Valid email address is required", 400, { requestId });
  }

  // Users may only query their own subscription status
  if (email !== (auth.user.email || "").trim().toLowerCase()) {
    return jsonError("You can only check your own subscription status", 403, { requestId });
  }

  const { data: existingSubscription } = await auth.supabase.rpc(
    "check_newsletter_subscription",
    {
      p_email: email,
    },
  );
  const subscription = (existingSubscription || {}) as {
    is_subscribed?: boolean;
    is_active?: boolean;
  };

  return NextResponse.json({
    success: true,
    is_subscribed: subscription.is_subscribed || false,
    is_active: subscription.is_active || false,
  });
}
