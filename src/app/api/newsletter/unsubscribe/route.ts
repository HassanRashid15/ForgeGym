import { NextResponse } from "next/server";
import { setNewsletterPreference } from "@/lib/newsletter";
import { verifyNewsletterEmailToken } from "@/lib/newsletter-token";
import {
  jsonError,
  rateLimitedResponse,
  getRequestId,
} from "@/lib/api/errors";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * GET/POST /api/newsletter/unsubscribe?email=&token=
 * One-click unsubscribe from promo emails (signed token).
 */
async function unsubscribe(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "newsletter:unsub"), 10, 60_000);
  if (!limited.allowed) return rateLimitedResponse(limited);

  const url = new URL(request.url);
  let email = (url.searchParams.get("email") || "").trim().toLowerCase();
  let token = (url.searchParams.get("token") || "").trim();

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    if (body?.email) email = String(body.email).trim().toLowerCase();
    if (body?.token) token = String(body.token).trim();
  }

  if (!email || !email.includes("@")) {
    return jsonError("Valid email is required", 400, { requestId });
  }
  if (!verifyNewsletterEmailToken(email, token)) {
    return jsonError("Invalid or expired unsubscribe link", 403, { requestId });
  }

  const result = await setNewsletterPreference(email, false, "email_unsubscribe");
  if (!result.success) {
    return jsonError(result.error || "Unsubscribe failed", 400, { requestId });
  }

  return NextResponse.json({
    success: true,
    email,
    message: "You have been unsubscribed from the Forge Gym newsletter.",
  });
}

export async function GET(request: Request) {
  return unsubscribe(request);
}

export async function POST(request: Request) {
  return unsubscribe(request);
}
