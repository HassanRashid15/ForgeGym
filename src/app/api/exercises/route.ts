import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { rateLimitedResponse, getRequestId } from "@/lib/api/errors";

export interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  gifUrl: string;
}

type OssExercise = {
  exerciseId?: string;
  name?: string;
  gifUrl?: string;
  bodyParts?: string[];
  equipments?: string[];
  targetMuscles?: string[];
};

const OSS_BASE = "https://oss.exercisedb.dev/api/v1";

/** Map UI / RapidAPI-style equipment labels → OSS filter values. */
function toOssEquipment(value: string): string {
  const v = value.trim().toLowerCase();
  if (v === "body weight" || v === "bodyweight") return "bodyweight";
  return v;
}

function mapExercise(row: OssExercise): Exercise | null {
  if (!row?.exerciseId || !row?.name) return null;
  return {
    id: row.exerciseId,
    name: row.name,
    bodyPart: row.bodyParts?.[0] || "",
    equipment: row.equipments?.[0] || "",
    target: row.targetMuscles?.[0] || "",
    gifUrl: row.gifUrl || "",
  };
}

async function fetchOssExercises(params: {
  bodyPart?: string | null;
  equipment?: string | null;
  target?: string | null;
  limit: string;
}): Promise<Exercise[]> {
  const qs = new URLSearchParams();
  qs.set("offset", "0");
  qs.set("limit", params.limit);

  if (params.bodyPart) qs.set("bodyParts", params.bodyPart);
  if (params.equipment) qs.set("equipments", toOssEquipment(params.equipment));
  if (params.target) qs.set("targetMuscles", params.target);

  const res = await fetch(`${OSS_BASE}/exercises?${qs.toString()}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`ExerciseDB OSS failed (${res.status})`);
  }

  const json = (await res.json()) as { success?: boolean; data?: OssExercise[] };
  const rows = Array.isArray(json?.data) ? json.data : [];
  return rows.map(mapExercise).filter((e): e is Exercise => Boolean(e));
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "public:exercises"), 120, 60_000);
  if (!limited.allowed) {
    return rateLimitedResponse(limited);
  }

  const { searchParams } = new URL(request.url);
  const bodyPart = searchParams.get("bodyPart");
  const equipment = searchParams.get("equipment");
  const target = searchParams.get("target");
  const limit = searchParams.get("limit") || "50";

  try {
    const exercises = await fetchOssExercises({
      bodyPart: bodyPart && bodyPart !== "all" ? bodyPart : null,
      equipment: equipment && equipment !== "all" ? equipment : null,
      target: target && target !== "all" ? target : null,
      limit,
    });
    return NextResponse.json(exercises);
  } catch (error) {
    console.error("Error fetching exercises:", error, { requestId });
    // Fallback without broken RapidAPI gif URLs (those need auth headers in <img>).
    const sampleExercises: Exercise[] = [
      {
        id: "sample-1",
        name: "Bench Press",
        bodyPart: "chest",
        equipment: "barbell",
        target: "pectorals",
        gifUrl: "",
      },
      {
        id: "sample-2",
        name: "Incline Dumbbell Press",
        bodyPart: "chest",
        equipment: "dumbbell",
        target: "pectorals",
        gifUrl: "",
      },
      {
        id: "sample-3",
        name: "Push-ups",
        bodyPart: "chest",
        equipment: "bodyweight",
        target: "pectorals",
        gifUrl: "",
      },
      {
        id: "sample-4",
        name: "Squats",
        bodyPart: "upper legs",
        equipment: "barbell",
        target: "quadriceps",
        gifUrl: "",
      },
      {
        id: "sample-5",
        name: "Deadlift",
        bodyPart: "upper legs",
        equipment: "barbell",
        target: "hamstrings",
        gifUrl: "",
      },
      {
        id: "sample-6",
        name: "Pull-ups",
        bodyPart: "back",
        equipment: "bodyweight",
        target: "lats",
        gifUrl: "",
      },
    ];
    return NextResponse.json(sampleExercises);
  }
}
