import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { cacheInvalidate } from "@/lib/api-cache";

async function gymOwnerFor(userId: string) {
  const service = createSupabaseServiceClient();
  if (!service) return null;
  const { data: roles } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isAdmin = (roles || []).some((r) => r.role === "admin");
  if (!isAdmin) return { service, isAdmin: false as const, gymOwnerId: null as string | null };

  const { data: profile } = await service
    .from("profiles")
    .select("gym_owner_id, is_super_admin")
    .eq("user_id", userId)
    .maybeSingle();

  if (profile?.is_super_admin) {
    return { service, isAdmin: true as const, gymOwnerId: null as string | null };
  }
  return {
    service,
    isAdmin: true as const,
    gymOwnerId: profile?.gym_owner_id || userId,
  };
}

/** GET /api/classes?gymOwnerId= — list classes + upcoming sessions */
export async function GET(request: Request) {
  const service = createSupabaseServiceClient();
  if (!service) return jsonError("Server misconfigured", 500);

  const url = new URL(request.url);
  const gymOwnerId = url.searchParams.get("gymOwnerId");
  if (!gymOwnerId) return jsonError("gymOwnerId required", 400);

  const { data: classes, error } = await service
    .from("gym_classes" as never)
    .select("*")
    .eq("gym_owner_id", gymOwnerId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError(
      error.message.includes("gym_classes")
        ? "Run migration 20260918_market_features.sql first"
        : error.message,
      400,
    );
  }

  const classIds = ((classes as { id: string }[]) || []).map((c) => c.id);
  let sessions: unknown[] = [];
  if (classIds.length) {
    const now = new Date().toISOString();
    const { data } = await service
      .from("class_sessions" as never)
      .select("*")
      .in("class_id", classIds)
      .eq("status", "scheduled")
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(40);
    sessions = data || [];
  }

  return NextResponse.json({ classes: classes || [], sessions });
}

/** POST /api/classes — create class (gym admin) */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const ctx = await gymOwnerFor(auth.user.id);
  if (!ctx?.service || !ctx.isAdmin || !ctx.gymOwnerId) {
    return jsonError("Gym admin only", 403);
  }

  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim();
  if (!name) return jsonError("Class name required", 400);

  const { data, error } = await ctx.service
    .from("gym_classes" as never)
    .insert({
      gym_owner_id: ctx.gymOwnerId,
      name,
      description: body?.description ? String(body.description).trim() : null,
      duration_minutes: Number(body?.durationMinutes) || 60,
      capacity: Number(body?.capacity) || 20,
      trainer_user_id: body?.trainerUserId || null,
    } as never)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  cacheInvalidate(`classes:${ctx.gymOwnerId}`);
  return NextResponse.json({ class: data }, { status: 201 });
}
