import { NextResponse } from "next/server";
import { getGymByOwnerId } from "@/lib/gyms";
import { jsonError } from "@/lib/api/errors";

type Params = { params: Promise<{ ownerId: string }> };

/** GET /api/gyms/[ownerId] — public gym detail */
export async function GET(_request: Request, { params }: Params) {
  const { ownerId } = await params;
  if (!ownerId) {
    return jsonError("ownerId required", 400);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return jsonError("Server misconfigured", 500);
  }

  const gym = await getGymByOwnerId(ownerId);
  if (!gym) {
    return jsonError("Gym not found", 404);
  }

  return NextResponse.json({ gym });
}
