import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";

/** POST /api/auth/check-verified — RPC only (no password probe). */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "auth:check-verified"), 20, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "check-verified", requestId });
    return rateLimitedResponse(limited);
  }

  const body = await request.json().catch(() => null);
  const email = body?.email?.trim()?.toLowerCase();

  if (!email) {
    return jsonError("Email is required", 400, { requestId });
  }

  const supabase = createSupabaseServerClient();

  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
    "check_user_verified",
    { user_email: email },
  );

  if (!rpcError && typeof rpcData === "boolean") {
    return NextResponse.json({ verified: rpcData });
  }

  // Do not probe sign-in — avoids credential enumeration side-channels
  return NextResponse.json({ verified: false });
}
