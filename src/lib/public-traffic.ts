import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getClientIpFromHeaders } from "@/lib/client-ip";

export type PublicTrafficRow = {
  id: string;
  ip_address: string;
  path: string;
  referrer: string | null;
  user_agent: string | null;
  visited_at: string;
};

const MAX_PATH = 500;
const MAX_UA = 512;
const MAX_REF = 500;

function cleanPath(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "/";
  let p = raw.trim().slice(0, MAX_PATH);
  if (!p.startsWith("/")) p = `/${p}`;
  // Block internal / noisy paths
  if (
    p.startsWith("/api") ||
    p.startsWith("/dashboard") ||
    p.startsWith("/_next") ||
    p.startsWith("/profile")
  ) {
    return "";
  }
  return p;
}

export async function recordPublicTraffic(
  request: Request,
  body?: { path?: string; referrer?: string | null },
): Promise<{ ok: boolean; skipped?: boolean }> {
  const path = cleanPath(body?.path);
  if (!path) return { ok: true, skipped: true };

  const service = createSupabaseServiceClient();
  if (!service) return { ok: false };

  const ip = getClientIpFromHeaders(request.headers);
  const ua = request.headers.get("user-agent")?.slice(0, MAX_UA) || null;
  const referrer =
    (typeof body?.referrer === "string" ? body.referrer : null)?.slice(0, MAX_REF) ||
    request.headers.get("referer")?.slice(0, MAX_REF) ||
    null;

  const { error } = await service.from("public_traffic" as never).insert({
    ip_address: ip || "unknown",
    path,
    referrer,
    user_agent: ua,
  } as never);

  if (error) {
    console.error("public_traffic insert:", error.message);
    return { ok: false };
  }
  return { ok: true };
}

export async function listPublicTraffic(limit = 200): Promise<{
  visits: PublicTrafficRow[];
  total: number;
  today: number;
  uniqueIps: number;
}> {
  const service = createSupabaseServiceClient();
  if (!service) {
    return { visits: [], total: 0, today: 0, uniqueIps: 0 };
  }

  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const [listRes, countRes, todayRes] = await Promise.all([
    service
      .from("public_traffic" as never)
      .select("id, ip_address, path, referrer, user_agent, visited_at")
      .order("visited_at", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 500)),
    service
      .from("public_traffic" as never)
      .select("id", { count: "exact", head: true }),
    service
      .from("public_traffic" as never)
      .select("id", { count: "exact", head: true })
      .gte("visited_at", since.toISOString()),
  ]);

  const visits = (listRes.data as PublicTrafficRow[] | null) || [];
  const uniqueIps = new Set(visits.map((v) => v.ip_address)).size;

  return {
    visits,
    total: countRes.count ?? visits.length,
    today: todayRes.count ?? 0,
    uniqueIps,
  };
}
