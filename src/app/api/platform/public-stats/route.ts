import { NextResponse } from "next/server";
import { getPlatformPublicStats } from "@/lib/platform-stats";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { rateLimitedResponse, getRequestId } from "@/lib/api/errors";

/**
 * GET /api/platform/public-stats — live public counters for home (no cache).
 */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "public:stats"), 60, 60_000);
  if (!limited.allowed) {
    return rateLimitedResponse(limited);
  }

  try {
    const stats = await getPlatformPublicStats();
    return NextResponse.json(
      { success: true, stats },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load platform stats";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
