import { EXERCISE_PRESETS, FOCUS_PRESETS, type FocusPreset } from "@/lib/progress-catalog";

export const MOOD_OPTIONS = [
  { id: "great", label: "Great — feeling strong", emoji: "🔥" },
  { id: "good", label: "Good — ready to train", emoji: "😊" },
  { id: "okay", label: "Okay — steady", emoji: "😐" },
  { id: "low", label: "Low — need a gentle session", emoji: "😔" },
  { id: "stressed", label: "Stressed — need to move it out", emoji: "😤" },
] as const;

export const ENERGY_OPTIONS = [
  { id: "high", label: "High energy", emoji: "⚡" },
  { id: "medium", label: "Medium energy", emoji: "🔋" },
  { id: "low", label: "Low energy", emoji: "🕯️" },
] as const;

export type MoodId = (typeof MOOD_OPTIONS)[number]["id"];
export type EnergyId = (typeof ENERGY_OPTIONS)[number]["id"];

export type MoodEnergyRecommendation = {
  focus: FocusPreset;
  exercises: string[];
  headline: string;
  blurb: string;
};

function pickExercises(focus: FocusPreset, count: number): string[] {
  const list = EXERCISE_PRESETS[focus] || [];
  return list.slice(0, Math.max(1, count));
}

/**
 * Map today's mood + energy → focus area and relevant exercises.
 */
export function recommendFromMoodEnergy(
  mood: MoodId,
  energy: EnergyId,
): MoodEnergyRecommendation {
  let focus: FocusPreset = "Full Body";
  let count = 5;
  let headline = "Here's your session";
  let blurb = "Exercises matched to how you feel today.";

  if (mood === "stressed") {
    focus = energy === "low" ? "Core" : "Cardio";
    count = energy === "high" ? 5 : 4;
    headline = "Move the stress out";
    blurb =
      energy === "low"
        ? "Gentle core work to reset without draining you."
        : "Cardio to clear your head and drop tension.";
  } else if (mood === "low") {
    focus = energy === "high" ? "Arms" : "Core";
    count = 3;
    headline = "Keep it light";
    blurb = "Short, manageable moves so you still win the day.";
  } else if (mood === "okay") {
    if (energy === "high") focus = "Back";
    else if (energy === "medium") focus = "Shoulders";
    else focus = "Core";
    count = energy === "low" ? 4 : 5;
    headline = "Solid steady work";
    blurb = "Balanced picks for an okay day.";
  } else if (mood === "good") {
    if (energy === "high") focus = "Legs";
    else if (energy === "medium") focus = "Chest";
    else focus = "Arms";
    count = energy === "high" ? 6 : 5;
    headline = "Good day to train";
    blurb = "Relevant lifts matched to your energy.";
  } else {
    // great
    if (energy === "high") focus = "Full Body";
    else if (energy === "medium") focus = "Legs";
    else focus = "Chest";
    count = energy === "high" ? 6 : 5;
    headline = "Push while you feel great";
    blurb = "Higher-output exercises while mood and energy line up.";
  }

  if (!(FOCUS_PRESETS as readonly string[]).includes(focus)) {
    focus = "Full Body";
  }

  return {
    focus,
    exercises: pickExercises(focus, count),
    headline,
    blurb,
  };
}

export function moodEnergyStorageKey(dateISO: string) {
  return `progress-mood-energy:${dateISO}`;
}

export type StoredMoodEnergy = {
  mood: MoodId;
  energy: EnergyId;
  focus: string;
  exercises: string[];
  at: string;
};
