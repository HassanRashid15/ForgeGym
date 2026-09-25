import { apiRequest } from "@/api/client";

export type PublicTrafficVisit = {
  id: string;
  ip_address: string;
  path: string;
  referrer: string | null;
  user_agent: string | null;
  visited_at: string;
};

export async function listAdminTraffic(limit = 200) {
  return apiRequest<{
    success: boolean;
    visits: PublicTrafficVisit[];
    total: number;
    today: number;
    uniqueIps: number;
    error?: string;
  }>("admin", "traffic", { query: { limit } });
}

export async function recordPublicTraffic(path: string, referrer?: string | null) {
  return apiRequest<{ ok: boolean; skipped?: boolean }>("traffic", "record", {
    body: { path, referrer: referrer ?? null },
  });
}
