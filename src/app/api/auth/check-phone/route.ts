import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";
import { findDuplicatePhone, isUsablePhone } from "@/lib/phone";

/** POST /api/auth/check-phone — duplicate phone across profiles */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "auth:check-phone"), 40, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "check-phone", requestId });
    return rateLimitedResponse(limited);
  }

  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const excludeUserId =
    typeof body?.excludeUserId === "string" ? body.excludeUserId.trim() : "";

  if (!phone) {
    return NextResponse.json({ exists: false });
  }

  if (!isUsablePhone(phone)) {
    return NextResponse.json({ exists: false, reason: "too_short" });
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ exists: null, warning: "unavailable" });
  }

  const taken = await findDuplicatePhone(service as any, phone, excludeUserId || null);

  return NextResponse.json({
    exists: taken,
    message: taken
      ? "This phone number is already used by another account."
      : undefined,
  });
}
