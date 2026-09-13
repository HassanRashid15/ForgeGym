/**
 * Resolve a form-demo YouTube video for an exercise name.
 * Prefers YouTube Data API when YOUTUBE_API_KEY is set; otherwise tries public Piped APIs.
 */

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.nosebs.ru",
];

export type ExerciseDemo = {
  youtubeVideoId: string;
  title: string | null;
  source: "youtube" | "piped";
};

function searchQuery(name: string): string {
  return `${name.trim()} exercise proper form`;
}

async function searchYouTubeOfficial(name: string): Promise<ExerciseDemo | null> {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) return null;

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("safeSearch", "strict");
  url.searchParams.set("q", searchQuery(name));
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), {
    next: { revalidate: 604800 },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string } }>;
  };
  const item = data.items?.[0];
  const videoId = item?.id?.videoId;
  if (!videoId) return null;

  return {
    youtubeVideoId: videoId,
    title: item?.snippet?.title || null,
    source: "youtube",
  };
}

type PipedItem = {
  type?: string;
  url?: string;
  title?: string;
  id?: string;
};

function videoIdFromPiped(item: PipedItem): string | null {
  if (item.id && /^[\w-]{11}$/.test(item.id)) return item.id;
  const url = item.url || "";
  const match = url.match(/[?&]v=([\w-]{11})/) || url.match(/\/watch\?v=([\w-]{11})/);
  return match?.[1] || null;
}

async function searchPiped(name: string): Promise<ExerciseDemo | null> {
  const q = encodeURIComponent(searchQuery(name));

  for (const base of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${base}/search?q=${q}&filter=videos`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 604800 },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const data = (await res.json()) as PipedItem[] | { items?: PipedItem[] };
      const items = Array.isArray(data) ? data : data.items || [];
      const stream = items.find((i) => (i.type || "stream") === "stream");
      const videoId = stream ? videoIdFromPiped(stream) : null;
      if (!videoId) continue;

      return {
        youtubeVideoId: videoId,
        title: stream?.title || null,
        source: "piped",
      };
    } catch {
      /* try next instance */
    }
  }

  return null;
}

export async function resolveExerciseDemo(name: string): Promise<ExerciseDemo | null> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 120) return null;

  const official = await searchYouTubeOfficial(trimmed);
  if (official) return official;

  return searchPiped(trimmed);
}
