import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** POST /api/auth/check-gym — detect duplicate gym name/city/phone among gym owners */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "auth:check-gym"), 30, 60_000);
  if (!limited.allowed) {
    trackEvent("auth.rate_limited", { route: "check-gym", requestId });
    return rateLimitedResponse(limited);
  }

  const body = await request.json().catch(() => null);
  const gymName = typeof body?.gym_name === "string" ? body.gym_name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!gymName && !phone) {
    return NextResponse.json({ duplicate: false, reason: null });
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ duplicate: false, reason: null, warning: "unavailable" });
  }

  if (gymName) {
    const nameKey = normalize(gymName);
    const { data: gymRows } = await service
      .from("gyms")
      .select("owner_user_id, name");

    const hit = (gymRows || []).find((g) => normalize(g.name || "") === nameKey);
    if (hit) {
      return NextResponse.json({
        duplicate: true,
        reason: "gym_name",
        message: `A gym named "${gymName}" is already registered. Please use a unique gym name.`,
      });
    }
  }

  if (phone) {
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length >= 7) {
      const { data: roles } = await service.from("user_roles").select("user_id").eq("role", "admin");
      const adminIds = Array.from(new Set((roles || []).map((r) => r.user_id).filter(Boolean)));

      if (adminIds.length > 0) {
        const { data: profiles } = await service
          .from("profiles")
          .select("user_id, phone, is_super_admin")
          .in("user_id", adminIds);

        const rows = (profiles || []).filter(
          (p: { is_super_admin?: boolean }) => !p.is_super_admin,
        );

        const hit = rows.find((p) => {
          const existing = (p.phone || "").replace(/\D/g, "");
          return existing.length >= 7 && existing === phoneDigits;
        });
        if (hit) {
          return NextResponse.json({
            duplicate: true,
            reason: "phone",
            message: "This phone number is already used by another gym owner account.",
          });
        }
      }
    }
  }

  return NextResponse.json({ duplicate: false, reason: null });
}
