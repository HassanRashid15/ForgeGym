import { NextResponse } from "next/server";
import { createSupabaseServiceClient, requireAuth } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/check-welcome-modal
 * Checks if welcome modal should be shown to a gym-owner admin
 */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "admin:check-welcome-modal"), 20, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "check-welcome-modal", requestId });
    return rateLimitedResponse(limited);
  }

  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const service = createSupabaseServiceClient();
  if (!service) {
    return jsonError("Server misconfigured", 500, { requestId });
  }

  try {
    const [{ data: roles }, { data: profile, error: profileError }, { data: gymRow }] =
      await Promise.all([
        service.from("user_roles").select("role").eq("user_id", auth.user.id),
        service
          .from("profiles")
          .select("admin_approved, welcome_modal_shown, full_name, is_super_admin, email")
          .eq("user_id", auth.user.id)
          .maybeSingle(),
        service
          .from("gyms")
          .select("name")
          .eq("owner_user_id", auth.user.id)
          .maybeSingle(),
      ]);

    const roleNames = (roles || []).map((r) => (r as { role: string }).role);
    if (!roleNames.includes("admin")) {
      return NextResponse.json({ showModal: false });
    }

    if (profileError && profileError.message?.includes("welcome_modal_shown")) {
      logger.info("welcome_modal_shown column doesn't exist yet, using fallback logic");

      const { data: fallbackProfile, error: fallbackError } = await service
        .from("profiles")
        .select("admin_approved, full_name, is_super_admin, email")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (fallbackError || !fallbackProfile) {
        return NextResponse.json({ showModal: false });
      }

      const typedFallback = fallbackProfile as {
        admin_approved?: boolean;
        full_name?: string;
        is_super_admin?: boolean;
        email?: string;
      };

      if (typedFallback.is_super_admin === true) {
        return NextResponse.json({ showModal: false });
      }

      return NextResponse.json({
        showModal: typedFallback.admin_approved === true,
        gymName: (gymRow as { name?: string } | null)?.name || null,
        userName: typedFallback.full_name,
      });
    }

    if (profileError) {
      logger.error("Error checking welcome modal status", { error: profileError });
      return NextResponse.json({ showModal: false });
    }

    if (!profile) {
      return NextResponse.json({ showModal: false });
    }

    const typedProfile = profile as {
      admin_approved?: boolean;
      welcome_modal_shown?: boolean;
      full_name?: string;
      is_super_admin?: boolean;
      email?: string;
    };

    if (typedProfile.is_super_admin === true) {
      return NextResponse.json({ showModal: false });
    }

    const showModal =
      typedProfile.admin_approved === true && typedProfile.welcome_modal_shown !== true;

    return NextResponse.json({
      showModal,
      gymName: (gymRow as { name?: string } | null)?.name || null,
      userName: typedProfile.full_name,
    });
  } catch (error) {
    logger.error("Unexpected error checking welcome modal status", { error });
    return NextResponse.json({ showModal: false });
  }
}
