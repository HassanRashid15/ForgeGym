import { NextResponse } from "next/server";
import { listApprovedGyms } from "@/lib/gyms";
import { jsonError } from "@/lib/api/errors";

/** GET /api/gyms — public list of approved gyms */
export async function GET() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return jsonError("Server misconfigured", 500);
    }
    const gyms = await listApprovedGyms();
    return NextResponse.json({ gyms });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list gyms";
    return jsonError(message, 400);
  }
}
