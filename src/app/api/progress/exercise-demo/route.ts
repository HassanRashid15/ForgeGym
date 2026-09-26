import { NextResponse } from "next/server";
import { resolveExerciseDemo } from "@/lib/exercise-demo";
import { resolveExerciseMedia } from "@/lib/workoutdb";
import { jsonError } from "@/lib/api/errors";

/**
 * GET /api/progress/exercise-demo?q=Bench%20Press
 * Returns WorkoutDB/ExerciseDB animation + optional MP4, plus YouTube fallback for Video tab.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (!q) {
    return jsonError("q query param required", 400);
  }

  try {
    const [media, youtube] = await Promise.all([
      resolveExerciseMedia(q),
      resolveExerciseDemo(q),
    ]);

    const youtubeSearchUrl =
      youtube?.youtubeVideoId
        ? `https://www.youtube.com/watch?v=${youtube.youtubeVideoId}`
        : `https://www.youtube.com/results?search_query=${encodeURIComponent(
            `${q} exercise proper form`,
          )}`;

    return NextResponse.json({
      query: q,
      name: media?.name || q,
      animationUrl: media?.animationUrl || null,
      videoUrl: media?.videoUrl || null,
      imageUrl: media?.imageUrl || null,
      instructions: media?.instructions || [],
      mediaSource: media?.source || null,
      youtubeVideoId: youtube?.youtubeVideoId || null,
      youtubeSearchUrl,
      title: youtube?.title || media?.name || null,
      source: youtube?.source || null,
    });
  } catch {
    return jsonError("Failed to resolve exercise demo", 502);
  }
}
