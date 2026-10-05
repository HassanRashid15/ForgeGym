import { NextResponse } from "next/server";

export interface Exercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  gifUrl: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bodyPart = searchParams.get("bodyPart");
  const equipment = searchParams.get("equipment");
  const target = searchParams.get("target");
  const limit = searchParams.get("limit") || "50";

  try {
    let url = `https://exercisedb.p.rapidapi.com/exercises?limit=${limit}&offset=0`;

    if (bodyPart) {
      url = `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${bodyPart}?limit=${limit}`;
    } else if (equipment) {
      url = `https://exercisedb.p.rapidapi.com/exercises/equipment/${equipment}?limit=${limit}`;
    } else if (target) {
      url = `https://exercisedb.p.rapidapi.com/exercises/target/${target}?limit=${limit}`;
    }

    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": process.env.EXERCISEDB_RAPIDAPI_KEY || "",
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch exercises from ExerciseDB");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching exercises:", error);
    // Return sample data if API fails or no key is configured
    const sampleExercises: Exercise[] = [
      {
        id: "1",
        name: "Bench Press",
        bodyPart: "chest",
        equipment: "barbell",
        target: "pectorals",
        gifUrl: "https://exercisedb.p.rapidapi.com/exercise/0001.gif",
      },
      {
        id: "2",
        name: "Incline Dumbbell Press",
        bodyPart: "chest",
        equipment: "dumbbell",
        target: "pectorals",
        gifUrl: "https://exercisedb.p.rapidapi.com/exercise/0002.gif",
      },
      {
        id: "3",
        name: "Push-ups",
        bodyPart: "chest",
        equipment: "body weight",
        target: "pectorals",
        gifUrl: "https://exercisedb.p.rapidapi.com/exercise/0003.gif",
      },
      {
        id: "4",
        name: "Squats",
        bodyPart: "legs",
        equipment: "barbell",
        target: "quadriceps",
        gifUrl: "https://exercisedb.p.rapidapi.com/exercise/0004.gif",
      },
      {
        id: "5",
        name: "Deadlift",
        bodyPart: "legs",
        equipment: "barbell",
        target: "hamstrings",
        gifUrl: "https://exercisedb.p.rapidapi.com/exercise/0005.gif",
      },
      {
        id: "6",
        name: "Pull-ups",
        bodyPart: "back",
        equipment: "body weight",
        target: "lats",
        gifUrl: "https://exercisedb.p.rapidapi.com/exercise/0006.gif",
      },
    ];
    return NextResponse.json(sampleExercises);
  }
}
