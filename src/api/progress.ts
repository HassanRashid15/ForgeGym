import { apiRequest } from "@/api/client";
import type { PersonalRecord, WorkoutExercise } from "@/lib/progress";

export type ProgressDayView = {
  date: string;
  id: string | null;
  focus: string;
  notes: string | null;
  focus_saves?: number;
  focus_locked?: boolean;
  duration_minutes: number | null;
  calories: number | null;
  exercises: WorkoutExercise[];
};

export type ProgressStats = {
  trainedDays: number;
  totalExercises: number;
  totalSets: number;
  totalDuration: number;
  totalCalories: number;
  streak: number;
};

export type ProgressPayload = {
  days: ProgressDayView[];
  personalRecords: PersonalRecord[];
  stats: ProgressStats;
};

export async function getProgress(options?: {
  days?: number;
  from?: string;
  to?: string;
}) {
  return apiRequest<ProgressPayload>("progress", "get", {
    query: {
      days: options?.days,
      from: options?.from,
      to: options?.to,
    },
  });
}

export async function upsertProgressDay(body: {
  day_date: string;
  focus: string;
  notes?: string | null;
  duration_minutes?: number | null;
  calories?: number | null;
}) {
  return apiRequest<{ day: { id: string; day_date: string; focus: string } }>(
    "progress",
    "save",
    { body: { action: "upsert_day", ...body } },
  );
}

export async function createProgressPr(body: {
  exercise_name: string;
  value: string;
  unit?: string;
  improvement?: string | null;
  achieved_at?: string;
}) {
  return apiRequest<{ record: PersonalRecord }>("progress", "save", {
    body: { action: "create_pr", ...body },
  });
}

export async function addProgressExercise(body: {
  workout_day_id: string;
  exercise_name: string;
  sets: number;
  reps: number;
  weight?: string | null;
}) {
  return apiRequest<{ exercise: WorkoutExercise }>("progress", "addExercise", {
    body,
  });
}

export type CatalogExercise = {
  name: string;
  imageUrl: string | null;
  videoUrl: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  howTo: string | null;
  equipment: string[];
};

export type ExerciseDemoResult = {
  query: string;
  name?: string | null;
  animationUrl?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  instructions?: string[];
  mediaSource?: "workoutdb" | "exercisedb" | "exercisedb_v2" | null;
  youtubeVideoId: string | null;
  youtubeSearchUrl: string;
  title: string | null;
  source: "youtube" | "piped" | null;
};

export async function getExerciseCatalog(focus: string) {
  return apiRequest<{
    focus: string;
    source: string;
    exercises: CatalogExercise[];
  }>("progress", "exerciseCatalog", {
    query: { focus },
  });
}

export async function getExerciseDemo(q: string) {
  return apiRequest<ExerciseDemoResult>("progress", "exerciseDemo", {
    query: { q },
  });
}

export async function deleteProgressExercise(id: string) {
  return apiRequest<{ success: boolean }>("progress", "deleteExercise", {
    query: { id },
  });
}

export async function deleteProgressRecord(id: string) {
  return apiRequest<{ success: boolean }>("progress", "deleteRecord", {
    query: { id },
  });
}
