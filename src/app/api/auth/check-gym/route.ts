import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";
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
  const gymCity = typeof body?.gym_city === "string" ? body.gym_city.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!gymName && !phone) {
    return NextResponse.json({ duplicate: false, reason: null });
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ duplicate: false, reason: null, warning: "unavailable" });
  }

  const { data: roles } = await service.from("user_roles").select("user_id").eq("role", "admin");
  const adminIds = Array.from(new Set((roles || []).map((r) => r.user_id).filter(Boolean)));

  if (adminIds.length === 0) {
    return NextResponse.json({ duplicate: false, reason: null });
  }

  const { data: profiles } = await service
    .from("profiles")
    .select("user_id, gym_name, gym_city, phone, is_super_admin, email")
    .in("user_id", adminIds);

  const rows = (profiles || []).filter((p) => !(p as any).is_super_admin);

  if (gymName) {
    const nameKey = normalize(gymName);
    const cityKey = gymCity ? normalize(gymCity) : "";
    const hit = rows.find((p) => {
      const existingName = normalize(p.gym_name || "");
      if (!existingName || existingName !== nameKey) return false;
      if (!cityKey) return true;
      const existingCity = normalize(p.gym_city || "");
      // Match full city or shared city token (e.g. "Lahore" vs "Lahore, Punjab")
      return (
        !existingCity ||
        existingCity === cityKey ||
        existingCity.includes(cityKey.split(",")[0]) ||
        cityKey.includes(existingCity.split(",")[0])
      );
    });

    if (hit) {
      return NextResponse.json({
        duplicate: true,
        reason: "gym_name_city",
        message: `A gym named "${gymName}" is already registered${
          hit.gym_city ? ` in ${hit.gym_city}` : ""
        }. Use a different name or contact support if this is your gym.`,
      });
    }
  }

  if (phone) {
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length >= 7) {
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

  return NextResponse.json({ duplicate: false, reason: null });
}
