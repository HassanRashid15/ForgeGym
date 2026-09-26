/** Shared catalogs for progress logging — select presets or custom. */

export const FOCUS_PRESETS = [
  "Legs",
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Core",
  "Cardio",
  "Full Body",
  "Rest",
] as const;

export type FocusPreset = (typeof FOCUS_PRESETS)[number];

export const EXERCISE_PRESETS: Record<string, string[]> = {
  Legs: [
    "Barbell Squat",
    "Leg Press",
    "Romanian Deadlift",
    "Walking Lunges",
    "Leg Curl",
    "Leg Extension",
    "Calf Raises",
  ],
  Chest: [
    "Bench Press",
    "Incline Dumbbell Press",
    "Cable Fly",
    "Push-Ups",
    "Chest Dip",
  ],
  Back: [
    "Deadlift",
    "Pull-Ups",
    "Barbell Row",
    "Lat Pulldown",
    "Seated Cable Row",
    "Face Pulls",
  ],
  Shoulders: [
    "Overhead Press",
    "Lateral Raise",
    "Front Raise",
    "Rear Delt Fly",
    "Arnold Press",
  ],
  Arms: [
    "Barbell Curl",
    "Hammer Curl",
    "Tricep Pushdown",
    "Skull Crushers",
    "Chin-Ups",
  ],
  Core: [
    "Plank",
    "Hanging Leg Raise",
    "Cable Crunch",
    "Russian Twist",
    "Ab Wheel",
  ],
  Cardio: [
    "Treadmill Run",
    "Cycling",
    "Rowing Machine",
    "Jump Rope",
    "Stair Climber",
  ],
  "Full Body": [
    "Burpees",
    "Kettlebell Swing",
    "Thruster",
    "Clean and Press",
    "Farmer Walk",
  ],
  Rest: [],
};

export const PR_EXERCISE_PRESETS = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Overhead Press",
  "Pull-Ups",
  "5K Run",
  "Plank Hold",
] as const;

export const PR_UNITS = ["lbs", "kg", "reps", "sec", "min", "km"] as const;

export function exercisesForFocus(focus: string): string[] {
  const key = focus.trim();
  if (key in EXERCISE_PRESETS) return EXERCISE_PRESETS[key];
  return [
    ...new Set([
      ...EXERCISE_PRESETS.Legs,
      ...EXERCISE_PRESETS.Chest,
      ...EXERCISE_PRESETS.Back,
      ...EXERCISE_PRESETS.Shoulders,
      ...EXERCISE_PRESETS.Arms,
      ...EXERCISE_PRESETS.Core,
      ...EXERCISE_PRESETS.Cardio,
      ...EXERCISE_PRESETS["Full Body"],
    ]),
  ];
}

export function localDateISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Last `count` calendar days ending today (oldest → newest). */
export function lastNDateISOs(count: number, end = new Date()): string[] {
  const dates: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    dates.push(localDateISO(d));
  }
  return dates;
}

/** Inclusive calendar date range (oldest → newest). Caps at 62 days. */
export function dateRangeISOs(fromIso: string, toIso: string): string[] {
  const from = new Date(`${fromIso}T12:00:00`);
  const to = new Date(`${toIso}T12:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];

  let start = from;
  let end = to;
  if (start > end) {
    start = to;
    end = from;
  }

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length < 62) {
    dates.push(localDateISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function formatDayLabel(iso: string, todayIso = localDateISO()): string {
  if (iso === todayIso) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === localDateISO(yesterday)) return "Yesterday";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Customers get a 24h edit window per calendar day (local midnight → next midnight). */
export const PROGRESS_DAY_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** How many times a customer may set/change a day's focus before it locks. */
export const MAX_FOCUS_SAVES = 2;

/**
 * Past workout days lock after their 24h window — still viewable, not editable.
 * Uses local calendar dates so "yesterday" locks once today begins.
 */
export function isProgressDayLocked(
  dayIso: string,
  now: Date = new Date(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayIso)) return true;
  const dayStart = new Date(`${dayIso}T00:00:00`);
  if (Number.isNaN(dayStart.getTime())) return true;
  return now.getTime() >= dayStart.getTime() + PROGRESS_DAY_EDIT_WINDOW_MS;
}

type ProgressDayMeta = {
  focus_saves?: number;
  text?: string;
};

/** Parse workout_days.notes — supports JSON meta or plain text. */
export function parseProgressDayNotes(
  notes: string | null | undefined,
): ProgressDayMeta {
  if (!notes?.trim()) return {};
  const raw = notes.trim();
  if (raw.startsWith("{")) {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      if (obj && typeof obj === "object") {
        const saves = Number(obj.focus_saves ?? obj.fs ?? 0);
        return {
          focus_saves: Number.isFinite(saves) ? Math.max(0, saves) : 0,
          text: typeof obj.text === "string" ? obj.text : undefined,
        };
      }
    } catch {
      /* treat as plain text */
    }
  }
  return { text: raw };
}

export function serializeProgressDayNotes(meta: ProgressDayMeta): string | null {
  const focus_saves = Math.max(0, meta.focus_saves || 0);
  const text = meta.text?.trim() || "";
  if (!focus_saves && !text) return null;
  if (!focus_saves && text) return text;
  return JSON.stringify({
    focus_saves,
    ...(text ? { text } : {}),
  });
}

export function getFocusSaveCount(notes: string | null | undefined): number {
  return Math.max(0, parseProgressDayNotes(notes).focus_saves || 0);
}

export function isFocusSaveLocked(notes: string | null | undefined): boolean {
  return getFocusSaveCount(notes) >= MAX_FOCUS_SAVES;
}

export function remainingFocusSaves(notes: string | null | undefined): number {
  return Math.max(0, MAX_FOCUS_SAVES - getFocusSaveCount(notes));
}

/**
 * Map a focus label (preset or custom like "leg press") to the catalog category
 * used for related exercises (e.g. Legs → wger Legs list).
 */
export function resolveCatalogFocus(focus: string): string {
  const t = focus.trim();
  if (!t) return t;
  const exact = FOCUS_PRESETS.find((p) => p.toLowerCase() === t.toLowerCase());
  if (exact) return exact;

  const lower = t.toLowerCase();
  if (
    /\b(legs?|squat|lunge|quads?|hamstrings?|calves|glutes?)\b/.test(lower) ||
    /leg\s*press/.test(lower)
  ) {
    return "Legs";
  }
  if (/\b(chest|bench|pecs?)\b/.test(lower)) return "Chest";
  if (/\b(back|rows?|pull-?ups?|lats?|deadlift)\b/.test(lower)) return "Back";
  if (/\b(shoulders?|delts?|overhead\s*press|ohp)\b/.test(lower)) {
    return "Shoulders";
  }
  if (/\b(arms?|biceps?|triceps?|curls?)\b/.test(lower)) return "Arms";
  if (/\b(core|abs?|plank)\b/.test(lower)) return "Core";
  if (/\b(cardio|run|bike|cycling|row|hiit|treadmill)\b/.test(lower)) {
    return "Cardio";
  }
  if (/\b(full\s*body|total\s*body)\b/.test(lower)) return "Full Body";
  if (/\brest\b/.test(lower)) return "Rest";
  return t;
}

/** Guided-session style estimate: work sec/set + 2 min rest between sets. */
export function estimateExerciseMinutes(
  sets: number,
  workSecPerSet = 45,
): number {
  const s = Math.max(0, Math.floor(sets) || 0);
  if (s <= 0) return 0;
  const sec = s * workSecPerSet + Math.max(0, s - 1) * 120;
  return Math.max(1, Math.round(sec / 60));
}

export function formatDurationMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}
