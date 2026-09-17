import { NextResponse } from "next/server";
import { listApprovedGyms } from "@/lib/gyms";
import { jsonError } from "@/lib/api/errors";
import {
  cacheGetOrSet,
  CacheTTL,
  withCacheHeaders,
} from "@/lib/api-cache";

/** GET /api/gyms — public list of approved gyms (cached) */
export async function GET() {
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
