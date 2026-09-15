import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";
import { verificationRedirectUrl } from "@/lib/site-url";

/** POST /api/auth/resend-verification */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "auth:resend"), 3, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "resend-verification", requestId });
    return rateLimitedResponse(limited);
  }

  const body = await request.json().catch(() => null);
  const email = body?.email?.trim()?.toLowerCase();

  if (!email) {
    return jsonError("Email is required", 400, { requestId });
  }

  const emailRedirectTo = verificationRedirectUrl(email, request);

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo },
  });

  if (error) {
    return jsonError(error.message, 400, { requestId });
  }

  return NextResponse.json({ ok: true });
}
