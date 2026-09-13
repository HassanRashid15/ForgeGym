import { NextResponse } from "next/server";
import { resolveExerciseDemo } from "@/lib/exercise-demo";
import { jsonError } from "@/lib/api/errors";

/**
 * GET /api/progress/exercise-demo?q=Bench%20Press
 * Returns a YouTube form demo for any exercise name (wger miss / custom names).
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (!q) {
    return jsonError("q query param required", 400);
  }

  try {
    const demo = await resolveExerciseDemo(q);
    if (!demo) {
      return NextResponse.json({
        query: q,
        youtubeVideoId: null,
        youtubeSearchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(
          `${q} exercise proper form`,
        )}`,
        title: null,
        source: null,
      });
    }

    return NextResponse.json({
      query: q,
      youtubeVideoId: demo.youtubeVideoId,
      youtubeSearchUrl: `https://www.youtube.com/watch?v=${demo.youtubeVideoId}`,
      title: demo.title,
      source: demo.source,
    });
  } catch {
    return jsonError("Failed to resolve exercise demo", 502);
  }
}
