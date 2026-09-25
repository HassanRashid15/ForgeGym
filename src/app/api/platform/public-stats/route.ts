import { NextResponse } from "next/server";
import { getPlatformPublicStats } from "@/lib/platform-stats";

/**
 * GET /api/platform/public-stats — live public counters for home (no cache).
 */
export async function GET() {
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
