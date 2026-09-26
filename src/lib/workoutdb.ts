/**
 * Exercise form media — prefers clean GIF animations (no WorkoutX-style watermark on free CDN).
 *
 * Sources (server-side only):
 * 1. Optional WorkoutDB key when WORKOUTDB_API_KEY is set (X-API-Key / X-WorkoutX-Key)
 * 2. ExerciseDB free OSS (oss.exercisedb.dev) — no key — GIF animations
 * 3. Optional RapidAPI ExerciseDB V2 for MP4 when EXERCISEDB_RAPIDAPI_KEY is set
 */

export type ExerciseMedia = {
  query: string;
  name: string | null;
  /** Animated form GIF */
  animationUrl: string | null;
  /** Direct MP4 when available */
  videoUrl: string | null;
  imageUrl: string | null;
  instructions: string[];
  source: "workoutdb" | "exercisedb" | "exercisedb_v2" | null;
};

type CacheEntry = { at: number; value: ExerciseMedia | null };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

function workoutdbKey(): string {
  return process.env.WORKOUTDB_API_KEY?.trim() || "";
}

function rapidApiKey(): string {
  return process.env.EXERCISEDB_RAPIDAPI_KEY?.trim() || "";
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

async function fetchJson(
  url: string,
  headers: Record<string, string>,
  timeoutMs = 8000,
): Promise<unknown | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, next: { revalidate: 0 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function pickBestMatch<T extends { name?: string }>(
  query: string,
  items: T[],
): T | null {
  if (!items.length) return null;
  const q = normalizeName(query);
  const exact = items.find((i) => normalizeName(i.name || "") === q);
  if (exact) return exact;
  const starts = items.find((i) => normalizeName(i.name || "").startsWith(q));
  if (starts) return starts;
  const includes = items.find((i) => normalizeName(i.name || "").includes(q));
  if (includes) return includes;
  // query words contained in name
  const words = q.split(" ").filter((w) => w.length > 2);
  if (words.length) {
    const scored = items
      .map((i) => {
        const n = normalizeName(i.name || "");
        const hit = words.filter((w) => n.includes(w)).length;
        return { i, hit };
      })
      .sort((a, b) => b.hit - a.hit);
    if (scored[0]?.hit) return scored[0].i;
  }
  return items[0] || null;
}

async function fromWorkoutDb(query: string): Promise<ExerciseMedia | null> {
  const key = workoutdbKey();
  if (!key) return null;

  const url = `https://api.workoutxapp.com/v1/exercises/name/${encodeURIComponent(query)}?limit=10`;
  const json = (await fetchJson(url, {
    "X-API-Key": key,
    "X-WorkoutX-Key": key,
    Accept: "application/json",
  })) as
    | { data?: Array<Record<string, unknown>> }
    | Array<Record<string, unknown>>
    | null;

  const list = Array.isArray(json)
    ? json
    : Array.isArray(json?.data)
      ? json.data
      : [];
  const match = pickBestMatch(
    query,
    list.map((row) => ({
      name: String(row.name || ""),
      gifUrl: String(row.gifUrl || ""),
      instructions: Array.isArray(row.instructions)
        ? (row.instructions as string[])
        : [],
    })),
  );
  if (!match?.gifUrl) return null;

  return {
    query,
    name: match.name || query,
    animationUrl: match.gifUrl,
    videoUrl: null,
    imageUrl: null,
    instructions: match.instructions || [],
    source: "workoutdb",
  };
}

async function fromExerciseDbFree(query: string): Promise<ExerciseMedia | null> {
  const searchUrl = `https://oss.exercisedb.dev/api/v1/exercises/search?search=${encodeURIComponent(query)}&threshold=0.45`;
  const search = (await fetchJson(searchUrl, { Accept: "application/json" })) as {
    success?: boolean;
    data?: Array<{ exerciseId?: string; name?: string; gifUrl?: string }>;
  } | null;

  const items = search?.data || [];
  const hit = pickBestMatch(query, items);
  if (!hit?.exerciseId) return null;

  const detail = (await fetchJson(
    `https://oss.exercisedb.dev/api/v1/exercises/${encodeURIComponent(hit.exerciseId)}`,
    { Accept: "application/json" },
  )) as {
    success?: boolean;
    data?: {
      name?: string;
      gifUrl?: string;
      instructions?: string[];
    };
  } | null;

  const d = detail?.data;
  const gif = d?.gifUrl || hit.gifUrl || null;
  if (!gif) return null;

  return {
    query,
    name: d?.name || hit.name || query,
    animationUrl: gif,
    videoUrl: null,
    imageUrl: null,
    instructions: Array.isArray(d?.instructions) ? d.instructions : [],
    source: "exercisedb",
  };
}

async function fromExerciseDbV2(query: string): Promise<Partial<ExerciseMedia> | null> {
  const key = rapidApiKey();
  if (!key) return null;

  const host = "edb-with-videos-and-images-by-ascendapi.p.rapidapi.com";
  const search = (await fetchJson(
    `https://${host}/api/v1/exercises/search?search=${encodeURIComponent(query)}&threshold=0.4`,
    {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": host,
      Accept: "application/json",
    },
  )) as {
    data?: Array<{ exerciseId?: string; name?: string }>;
  } | null;

  const hit = pickBestMatch(query, search?.data || []);
  if (!hit?.exerciseId) return null;

  const detail = (await fetchJson(
    `https://${host}/api/v1/exercises/${encodeURIComponent(hit.exerciseId)}`,
    {
      "X-RapidAPI-Key": key,
      "X-RapidAPI-Host": host,
      Accept: "application/json",
    },
  )) as {
    data?: {
      name?: string;
      videoUrl?: string;
      imageUrl?: string;
      gifUrl?: string;
      gifUrls?: Record<string, string>;
      videoUrls?: Record<string, string>;
      instructions?: string[];
    };
  } | null;

  const d = detail?.data;
  if (!d) return null;

  const video =
    d.videoUrl ||
    d.videoUrls?.["480p"] ||
    d.videoUrls?.["720p"] ||
    d.videoUrls?.["360p"] ||
    null;
  const gif =
    d.gifUrl ||
    d.gifUrls?.["480p"] ||
    d.gifUrls?.["360p"] ||
    d.gifUrls?.["720p"] ||
    null;

  return {
    name: d.name || hit.name || query,
    animationUrl: gif,
    videoUrl: video,
    imageUrl: d.imageUrl || null,
    instructions: Array.isArray(d.instructions) ? d.instructions : [],
    source: "exercisedb_v2",
  };
}

export async function resolveExerciseMedia(query: string): Promise<ExerciseMedia | null> {
  const q = query.trim();
  if (!q) return null;

  const cacheKey = normalizeName(q);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  let result: ExerciseMedia | null = null;

  // Prefer WorkoutDB key when present, else free ExerciseDB GIFs
  result = (await fromWorkoutDb(q)) || (await fromExerciseDbFree(q));

  // Enrich with MP4 from RapidAPI V2 when available
  const v2 = await fromExerciseDbV2(q);
  if (v2) {
    result = {
      query: q,
      name: v2.name || result?.name || q,
      animationUrl: result?.animationUrl || v2.animationUrl || null,
      videoUrl: v2.videoUrl || result?.videoUrl || null,
      imageUrl: v2.imageUrl || result?.imageUrl || null,
      instructions:
        (v2.instructions && v2.instructions.length
          ? v2.instructions
          : result?.instructions) || [],
      source: v2.videoUrl ? "exercisedb_v2" : result?.source || "exercisedb_v2",
    };
  }

  cache.set(cacheKey, { at: Date.now(), value: result });
  return result;
}
