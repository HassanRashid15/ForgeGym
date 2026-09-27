import { NextResponse } from "next/server";
import { createSupabaseServiceClient, requireAuth } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";

/**
 * POST /api/admin/welcome-modal
 * Marks welcome modal as shown and saves Classes/Schedule feature prefs
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "admin:welcome-modal"), 10, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "welcome-modal", requestId });
    return rateLimitedResponse(limited);
  }

  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const service = createSupabaseServiceClient();
  if (!service) {
    return jsonError("Server misconfigured", 500, { requestId });
  }

  let enableClasses = false;
  let enableSchedule = false;
  let enableMembership = false;
  try {
    const body = await request.json().catch(() => ({}));
    enableClasses = body?.enableClasses === true;
    enableSchedule = body?.enableSchedule === true;
    enableMembership = body?.enableMembership === true;
  } catch {
    // keep defaults
  }

  try {
    const { error } = await service
      .from("profiles")
      .update({
        welcome_modal_shown: true,
        feature_classes_enabled: enableClasses,
        feature_schedule_enabled: enableSchedule,
        feature_membership_enabled: enableMembership,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("user_id", auth.user.id);

    if (error) {
      // Column(s) may not exist yet — try progressive fallbacks
      const msg = error.message || "";
      if (
        msg.includes("welcome_modal_shown") ||
        msg.includes("feature_classes_enabled") ||
        msg.includes("feature_schedule_enabled") ||
        msg.includes("feature_membership_enabled")
      ) {
        console.log("Some welcome-modal columns missing, using partial update");
        const { error: fallbackError } = await service
          .from("profiles")
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", auth.user.id);

        if (fallbackError) {
          console.error("Error updating profile as fallback:", fallbackError);
        }
      } else {
        console.error("Error marking welcome modal as shown:", error);
      }
    }

    trackEvent("admin_welcome_modal_shown" as any, {
      userId: auth.user.id,
      requestId,
      enableClasses,
      enableSchedule,
      enableMembership,
    });

    return NextResponse.json({
      success: true,
      enableClasses,
      enableSchedule,
      enableMembership,
    });
  } catch (error) {
    console.error("Unexpected error marking welcome modal as shown:", error);
    return NextResponse.json({ success: true, note: "Unexpected error" });
  }
}
