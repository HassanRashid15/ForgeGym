import { NextResponse } from "next/server";
import { exercisesForFocus } from "@/lib/progress-catalog";
import { jsonError } from "@/lib/api/errors";

/** Map our Day Focus labels → wger.de exercisecategory ids (public API). */
const WGER_CATEGORY_BY_FOCUS: Record<string, number[]> = {
  Legs: [9, 14],
  Chest: [11],
  Back: [12],
  Shoulders: [13],
  Arms: [8],
  Core: [10],
  Cardio: [15],
  "Full Body": [9, 11, 12, 13, 8],
};

export type CatalogExercise = {
  name: string;
  imageUrl: string | null;
  videoUrl: string | null;
  /** Primary muscles / main effects */
  primaryMuscles: string[];
  /** Secondary muscles / supporting effects */
  secondaryMuscles: string[];
  /** Plain-text how-to steps */
  howTo: string | null;
  equipment: string[];
};

type WgerMuscle = {
  name?: string;
  name_en?: string;
};

type WgerTranslation = {
  language?: number | { id?: number };
  name?: string;
  description?: string;
};

type WgerImage = {
  image?: string;
  is_main?: boolean;
  thumbnails?: { small?: string; medium?: string };
};

type WgerVideo = {
  video?: string;
  is_main?: boolean;
};

type WgerEquipment = {
  name?: string;
};

type WgerExerciseInfo = {
  translations?: WgerTranslation[];
  name?: string;
  images?: WgerImage[];
  videos?: WgerVideo[];
  muscles?: WgerMuscle[];
  muscles_secondary?: WgerMuscle[];
  equipment?: WgerEquipment[];
};

function muscleLabel(m: WgerMuscle): string {
  return (m.name_en || m.name || "").trim();
}

function uniqueLabels(list: WgerMuscle[] | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of list || []) {
    const label = muscleLabel(m);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function englishTranslation(item: WgerExerciseInfo): WgerTranslation | null {
  const translations = item.translations || [];
  const en = translations.find((t) => {
    const lang = t.language;
    if (typeof lang === "number") return lang === 2;
    return lang?.id === 2;
  });
  return en || translations[0] || null;
}

function englishName(item: WgerExerciseInfo): string | null {
  const t = englishTranslation(item);
  const name = (t?.name || item.name || "").trim();
  return name || null;
}

function pickDetails(item: WgerExerciseInfo): Omit<CatalogExercise, "name"> {
  const images = item.images || [];
  const mainImg = images.find((i) => i.is_main) || images[0];
  const imageUrl =
    mainImg?.thumbnails?.medium ||
    mainImg?.thumbnails?.small ||
    mainImg?.image ||
    null;

  const videos = item.videos || [];
  const mainVid = videos.find((v) => v.is_main) || videos[0];
  const videoUrl = mainVid?.video || null;

  const t = englishTranslation(item);
  const howTo = t?.description ? stripHtml(t.description) : null;

  return {
    imageUrl,
    videoUrl,
    primaryMuscles: uniqueLabels(item.muscles),
    secondaryMuscles: uniqueLabels(item.muscles_secondary),
    howTo: howTo || null,
    equipment: (item.equipment || [])
      .map((e) => (e.name || "").trim())
      .filter(Boolean),
  };
}

function emptyDetails(): Omit<CatalogExercise, "name"> {
  return {
    imageUrl: null,
    videoUrl: null,
    primaryMuscles: [],
    secondaryMuscles: [],
    howTo: null,
    equipment: [],
  };
}

function richer(a: CatalogExercise, b: CatalogExercise): CatalogExercise {
  return {
    name: a.name,
    imageUrl: a.imageUrl || b.imageUrl,
    videoUrl: a.videoUrl || b.videoUrl,
    primaryMuscles: a.primaryMuscles.length ? a.primaryMuscles : b.primaryMuscles,
    secondaryMuscles: a.secondaryMuscles.length
      ? a.secondaryMuscles
      : b.secondaryMuscles,
    howTo: a.howTo || b.howTo,
    equipment: a.equipment.length ? a.equipment : b.equipment,
  };
}

async function fetchWgerExercises(categoryIds: number[]): Promise<CatalogExercise[]> {
  const byName = new Map<string, CatalogExercise>();

  await Promise.all(
    categoryIds.map(async (categoryId) => {
      const url = new URL("https://wger.de/api/v2/exerciseinfo/");
      url.searchParams.set("category", String(categoryId));
      url.searchParams.set("limit", "40");

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
      });
      if (!res.ok) return;

      const data = (await res.json()) as { results?: WgerExerciseInfo[] };
      for (const item of data.results || []) {
        const name = englishName(item);
        if (!name) continue;
        const next: CatalogExercise = { name, ...pickDetails(item) };
        const existing = byName.get(name);
        if (!existing) {
          byName.set(name, next);
          continue;
        }
        byName.set(name, richer(next, existing));
      }
    }),
  );

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function localAsCatalog(focus: string): CatalogExercise[] {
  return exercisesForFocus(focus).map((name) => ({
    name,
    ...emptyDetails(),
  }));
}

function mergeCatalog(
  local: CatalogExercise[],
  remote: CatalogExercise[],
): CatalogExercise[] {
  const byName = new Map<string, CatalogExercise>();
  for (const ex of local) byName.set(ex.name, ex);
  for (const ex of remote) {
    const prev = byName.get(ex.name);
    byName.set(ex.name, prev ? richer(ex, prev) : ex);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * GET /api/progress/exercise-catalog?focus=Chest
 * Returns exercises with effects (muscles), how-to text, and demo media from wger.de
 */
export async function GET(request: Request) {
  const focus = new URL(request.url).searchParams.get("focus")?.trim() || "";
  if (!focus) {
    return jsonError("focus query param required", 400);
  }

  if (focus.toLowerCase() === "rest") {
    return NextResponse.json({ focus, source: "local", exercises: [] });
  }

  const local = localAsCatalog(focus);
  const categoryIds = WGER_CATEGORY_BY_FOCUS[focus];

  if (!categoryIds?.length) {
    try {
      const url = new URL("https://wger.de/api/v2/exerciseinfo/");
      url.searchParams.set("limit", "30");
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        const data = (await res.json()) as { results?: WgerExerciseInfo[] };
        const remote: CatalogExercise[] = [];
        for (const item of data.results || []) {
          const name = englishName(item);
          if (!name) continue;
          remote.push({ name, ...pickDetails(item) });
        }
        return NextResponse.json({
          focus,
          source: "wger+local",
          exercises: mergeCatalog(local, remote),
        });
      }
    } catch {
      /* fall through */
    }
    return NextResponse.json({ focus, source: "local", exercises: local });
  }

  try {
    const remote = await fetchWgerExercises(categoryIds);
    if (remote.length > 0) {
      return NextResponse.json({
        focus,
        source: "wger+local",
        exercises: mergeCatalog(local, remote),
      });
    }
  } catch {
    /* use local */
  }

  return NextResponse.json({ focus, source: "local", exercises: local });
}
