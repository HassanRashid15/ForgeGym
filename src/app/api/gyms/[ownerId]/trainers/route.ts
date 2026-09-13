import { NextResponse } from "next/server";
import { getGymTrainers } from "@/lib/gyms";
import { jsonError } from "@/lib/api/errors";

type Params = { params: Promise<{ ownerId: string }> };

/** GET /api/gyms/[ownerId]/trainers — public trainers for a gym */
export async function GET(_request: Request, { params }: Params) {
  const { ownerId } = await params;
  if (!ownerId) {
    return jsonError("ownerId required", 400);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonError("Server misconfigured", 500);
  }

  const trainers = await getGymTrainers(ownerId);
  return NextResponse.json({ trainers });
}
