import { NextResponse } from "next/server";
import { listApprovedGyms } from "@/lib/gyms";
import { jsonError } from "@/lib/api/errors";
import {
  cacheGetOrSet,
  CacheTTL,
  withCacheHeaders,
} from "@/lib/api-cache";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { rateLimitedResponse, getRequestId } from "@/lib/api/errors";

/** GET /api/gyms — public list of approved gyms (cached) */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "public:gyms"), 60, 60_000);
  if (!limited.allowed) {
    return rateLimitedResponse(limited);
  }

  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return jsonError("Server misconfigured", 500);
    }
    const { data, hit } = await cacheGetOrSet(
      "public:gyms",
      CacheTTL.public,
      async () => {
        const gyms = await listApprovedGyms();
        return { gyms };
      },
    );
    return NextResponse.json(
      data,
      withCacheHeaders(undefined, Math.floor(CacheTTL.public / 1000), hit),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list gyms";
    return jsonError(message, 400);
  }
}
