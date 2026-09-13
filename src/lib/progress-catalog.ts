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
