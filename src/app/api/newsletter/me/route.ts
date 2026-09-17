import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import {
  checkNewsletterSubscription,
  setNewsletterPreference,
} from "@/lib/newsletter";
import { jsonError } from "@/lib/api/errors";

/** GET /api/newsletter/me — current user's newsletter preference */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const email = (auth.user.email || "").toLowerCase();
  if (!email) return jsonError("No email on account", 400);

  const status = await checkNewsletterSubscription(email);
  return NextResponse.json({
    success: true,
    email,
    subscribed: status.is_subscribed && status.is_active,
    ...status,
  });
}

/** PATCH /api/newsletter/me — subscribe / unsubscribe for current user */
export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const email = (auth.user.email || "").toLowerCase();
  if (!email) return jsonError("No email on account", 400);

  const body = await request.json().catch(() => null);
  const subscribe = body?.subscribe === true;

  const result = await setNewsletterPreference(
    email,
    subscribe,
    subscribe ? undefined : "settings_toggle",
  );

  if (!result.success) {
    return jsonError(result.error || "Failed to update preference", 400);
  }

  return NextResponse.json({
    success: true,
    subscribed: subscribe,
    ...result,
  });
}
