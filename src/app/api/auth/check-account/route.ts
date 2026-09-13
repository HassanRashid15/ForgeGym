import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";

/** POST /api/auth/check-account */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "auth:check-account"), 30, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "check-account", requestId });
    return rateLimitedResponse(limited);
  }

  const body = await request.json().catch(() => null);
  const email = body?.email?.trim()?.toLowerCase();

  if (!email) {
    return jsonError("Email is required", 400, { requestId });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await (supabase.rpc as any)("check_user_exists", {
    check_email: email,
  });

  if (error) {
    return NextResponse.json({ exists: null });
  }

  return NextResponse.json({ exists: typeof data === "boolean" ? data : null });
}
