import { apiRequest } from "@/api/client";
import type { PlatformPublicStats } from "@/lib/platform-stats";

/** platform.publicStats → GET /api/platform/public-stats */
export async function fetchPublicPlatformStats() {
  return apiRequest<{ success?: boolean; stats?: PlatformPublicStats }>(
    "platform",
    "publicStats",
  );
}
