import { headers } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export function getClientIpFromHeaders(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    h.get("cf-connecting-ip")?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function getRequestClientIp(): Promise<string> {
  const h = await headers();
  return getClientIpFromHeaders(h);
}

type SplashVisitorRow = { ip_address: string };

/**
 * Returns true if this IP already saw the home preloader.
 * On miss, inserts the row (first visit). Fail-open: treat as first visit if DB unavailable.
 */
export async function claimFirstSplashVisit(
  ip: string,
  userAgent?: string | null,
): Promise<{ isFirstVisit: boolean }> {
  if (!ip || ip === "unknown") {
    return { isFirstVisit: true };
  }

  const service = createSupabaseServiceClient();
  if (!service) return { isFirstVisit: true };

  const { data: existing, error: selectError } = await service
    .from("splash_visitors" as never)
    .select("ip_address")
    .eq("ip_address", ip)
    .maybeSingle();

  if (selectError) {
    console.error("splash_visitors select:", selectError.message);
    return { isFirstVisit: true };
  }

  if (existing) {
    return { isFirstVisit: false };
  }

  const { error: insertError } = await service
    .from("splash_visitors" as never)
    .insert({
      ip_address: ip,
      user_agent: userAgent?.slice(0, 512) || null,
    } as never);

  if (insertError) {
    if (insertError.code === "23505") {
      return { isFirstVisit: false };
    }
    console.error("splash_visitors insert:", insertError.message);
    return { isFirstVisit: true };
  }

  return { isFirstVisit: true };
}

export async function hasSplashVisitor(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") return false;
  const service = createSupabaseServiceClient();
  if (!service) return false;

  const { data } = await service
    .from("splash_visitors" as never)
    .select("ip_address")
    .eq("ip_address", ip)
    .maybeSingle();

  return Boolean((data as SplashVisitorRow | null)?.ip_address);
}
