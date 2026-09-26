import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { notify } from "@/lib/notify-actions";

async function assertGymAdmin(service: NonNullable<ReturnType<typeof createSupabaseServiceClient>>, userId: string, gymOwnerId: string) {
  const { data: roles } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (!(roles || []).some((r) => r.role === "admin")) return false;
  const { data: profile } = await service
    .from("profiles")
    .select("gym_owner_id, is_super_admin")
    .eq("user_id", userId)
    .maybeSingle();
  if (profile?.is_super_admin) return true;
  const owner = profile?.gym_owner_id || userId;
  return owner === gymOwnerId;
}

/** POST /api/classes/sessions — schedule a session (gym admin) */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const service = createSupabaseServiceClient();
  if (!service) return jsonError("Server misconfigured", 500);

  const body = await request.json().catch(() => null);
  const classId = String(body?.classId || "").trim();
  const startsAt = String(body?.startsAt || "").trim();
  if (!classId || !startsAt) return jsonError("classId and startsAt required", 400);

  const { data: cls } = await service
    .from("gym_classes" as never)
    .select("id, gym_owner_id, duration_minutes, name")
    .eq("id", classId)
    .maybeSingle();

  const row = cls as {
    id: string;
    gym_owner_id: string;
    duration_minutes: number;
    name?: string;
  } | null;
  if (!row) return jsonError("Class not found", 404);

  const ok = await assertGymAdmin(service, auth.user.id, row.gym_owner_id);
  if (!ok) return jsonError("Forbidden", 403);

  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return jsonError("Invalid startsAt", 400);
  const end = new Date(start.getTime() + (row.duration_minutes || 60) * 60_000);

  const { data, error } = await service
    .from("class_sessions" as never)
    .insert({
      class_id: classId,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: "scheduled",
    } as never)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(error.message, 400);

  void notify.classSessionScheduled(
    auth.user.id,
    row.name || "Class",
    start.toLocaleString(),
  );

  return NextResponse.json({ session: data }, { status: 201 });
}

/** PUT /api/classes/sessions — book a session (member) body: { sessionId } */
export async function PUT(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const service = createSupabaseServiceClient();
  if (!service) return jsonError("Server misconfigured", 500);

  const body = await request.json().catch(() => null);
  const sessionId = String(body?.sessionId || "").trim();
  if (!sessionId) return jsonError("sessionId required", 400);

  const { data: session } = await service
    .from("class_sessions" as never)
    .select("id, status, starts_at, class_id")
    .eq("id", sessionId)
    .maybeSingle();

  const s = session as {
    id: string;
    status: string;
    starts_at: string;
    class_id?: string;
  } | null;
  if (!s || s.status !== "scheduled") {
    return jsonError("Session not available", 400);
  }

  let className = "Class";
  if (s.class_id) {
    const { data: cls } = await service
      .from("gym_classes" as never)
      .select("name")
      .eq("id", s.class_id)
      .maybeSingle();
    const name = (cls as { name?: string } | null)?.name;
    if (name) className = name;
  }

  const { data, error } = await service
    .from("class_bookings" as never)
    .upsert(
      {
        session_id: sessionId,
        user_id: auth.user.id,
        status: "booked",
        booked_at: new Date().toISOString(),
      } as never,
      { onConflict: "session_id,user_id" },
    )
    .select("*")
    .maybeSingle();

  if (error) return jsonError(error.message, 400);

  const start = new Date(s.starts_at);
  const date = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  void notify.classBooked(auth.user.id, className, date, time);

  return NextResponse.json({ booking: data });
}
