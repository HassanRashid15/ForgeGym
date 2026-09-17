import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

async function resolveGymOwnerId(
  db: ReturnType<typeof createSupabaseServiceClient> extends infer T
    ? NonNullable<T>
    : never,
  userId: string,
) {
  const { data: profile } = await db
    .from("profiles")
    .select("gym_owner_id, is_super_admin")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: roles } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isAdmin = (roles || []).some((r) => r.role === "admin");

  if (isAdmin && !profile?.is_super_admin) {
    return { gymOwnerId: profile?.gym_owner_id || userId, isAdmin: true as const };
  }
  return {
    gymOwnerId: profile?.gym_owner_id || null,
    isAdmin: false as const,
  };
}

/** GET /api/attendance — recent check-ins (own or gym) */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const service = createSupabaseServiceClient();
  if (!service) return jsonError("Server misconfigured", 500);

  const scope = new URL(request.url).searchParams.get("scope") || "me";
  const { gymOwnerId, isAdmin } = await resolveGymOwnerId(service, auth.user.id);

  let query = service
    .from("attendance_checkins" as never)
    .select("id, gym_owner_id, user_id, checked_in_at, source, notes")
    .order("checked_in_at", { ascending: false })
    .limit(50);

  if (scope === "gym" && isAdmin && gymOwnerId) {
    query = query.eq("gym_owner_id", gymOwnerId);
  } else {
    query = query.eq("user_id", auth.user.id);
  }

  const { data, error } = await query;
  if (error) {
    return jsonError(
      error.message.includes("attendance_checkins")
        ? "Run migration 20260918_market_features.sql first"
        : error.message,
      400,
    );
  }

  return NextResponse.json({ checkins: data || [] });
}

/** POST /api/attendance — member self check-in or admin check-in for member */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const service = createSupabaseServiceClient();
  if (!service) return jsonError("Server misconfigured", 500);

  const body = await request.json().catch(() => null);
  const { gymOwnerId, isAdmin } = await resolveGymOwnerId(service, auth.user.id);

  let targetUserId = auth.user.id;
  let targetGymOwnerId = gymOwnerId;

  if (isAdmin && body?.userId) {
    targetUserId = String(body.userId);
    targetGymOwnerId = gymOwnerId;
  }

  if (!targetGymOwnerId) {
    return jsonError("Join a gym before checking in", 400);
  }

  // One check-in per calendar day
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data: existing } = await service
    .from("attendance_checkins" as never)
    .select("id")
    .eq("user_id", targetUserId)
    .eq("gym_owner_id", targetGymOwnerId)
    .gte("checked_in_at", start.toISOString())
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      success: true,
      alreadyCheckedIn: true,
      checkin: existing,
    });
  }

  const { data, error } = await service
    .from("attendance_checkins" as never)
    .insert({
      gym_owner_id: targetGymOwnerId,
      user_id: targetUserId,
      source: body?.source || "manual",
      notes: body?.notes || null,
    } as never)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ success: true, checkin: data });
}
