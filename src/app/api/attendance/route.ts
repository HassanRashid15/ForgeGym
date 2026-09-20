import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { getGymByOwnerId } from "@/lib/gyms";
import {
  currentSlot,
  formatSlotLabel,
  isSlotAllowedForGender,
  slotsForGender,
  type AttendanceSlot,
} from "@/lib/attendance";
import {
  ATTENDANCE_CLOSED_MESSAGE,
  ATTENDANCE_GEO_RADIUS_M,
  canViewGymAttendance,
  dailyCheckInCode,
  filterByRole,
  isAttendanceOpen,
  requireBinaryGender,
  verifyPresence,
} from "@/lib/attendance-security";
import { notify } from "@/lib/notify-actions";
import {
  apiCacheKey,
  cacheAside,
  cacheInvalidate,
  CacheTTL,
} from "@/lib/api-cache";

type Db = NonNullable<ReturnType<typeof createSupabaseServiceClient>>;

const ATTENDANCE_CACHE_TTL_MS = CacheTTL.attendance;

async function invalidateAttendanceCache(opts: {
  gymOwnerId: string | null;
  userId: string;
}) {
  const prefixes: string[] = [
    apiCacheKey("attendance", "user", opts.userId),
  ];
  if (opts.gymOwnerId) {
    prefixes.push(apiCacheKey("attendance", "gym", opts.gymOwnerId));
  }
  await cacheInvalidate({ prefixes });
}

function formatDurationShort(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const totalSec = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function roleLabel(role: string) {
  if (role === "admin") return "gym owner";
  return role || "member";
}

async function resolveActor(db: Db, userId: string) {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    db
      .from("profiles")
      .select("gym_owner_id, is_super_admin, full_name, gender, email")
      .eq("user_id", userId)
      .maybeSingle(),
    db.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const roleNames = (roles || []).map((r) => r.role as string);
  const isAdmin =
    roleNames.includes("admin") && profile?.is_super_admin !== true;
  const isTrainer = roleNames.includes("trainer");
  const isStaff = roleNames.includes("staff");

  let role = "customer";
  if (isAdmin) role = "admin";
  else if (isTrainer) role = "trainer";
  else if (isStaff) role = "staff";
  else if (roleNames.includes("moderator")) role = "moderator";

  const gymOwnerId = isAdmin
    ? profile?.gym_owner_id || userId
    : profile?.gym_owner_id || null;

  return {
    gymOwnerId,
    isAdmin,
    isTrainer,
    canViewGym: Boolean(isAdmin),
    role,
    fullName: (profile?.full_name as string | null) || null,
    gender: (profile?.gender as string | null) || null,
    email: (profile?.email as string | null) || null,
  };
}

async function enrichRows(db: Db, rows: Array<Record<string, unknown>>) {
  const userIds = [
    ...new Set(rows.map((r) => r.user_id as string).filter(Boolean)),
  ];
  if (userIds.length === 0) return [] as Array<Record<string, unknown>>;

  const [{ data: profiles }, { data: roleRows }] = await Promise.all([
    db
      .from("profiles")
      .select("user_id, full_name, email, gender, avatar_url")
      .in("user_id", userIds),
    db.from("user_roles").select("user_id, role").in("user_id", userIds),
  ]);

  const profileByUser = new Map(
    (profiles || []).map((p) => [p.user_id as string, p]),
  );
  const rolesByUser = new Map<string, string[]>();
  for (const row of roleRows || []) {
    const list = rolesByUser.get(row.user_id) || [];
    list.push(row.role);
    rolesByUser.set(row.user_id, list);
  }

  function primaryRole(userId: string, snapshot: string | null): string {
    if (snapshot) return snapshot;
    const names = rolesByUser.get(userId) || [];
    if (names.includes("admin")) return "admin";
    if (names.includes("trainer")) return "trainer";
    if (names.includes("staff")) return "staff";
    return "customer";
  }

  return rows.map((r) => {
    const uid = r.user_id as string;
    const p = profileByUser.get(uid);
    return {
      id: r.id,
      gym_owner_id: r.gym_owner_id,
      user_id: uid,
      checked_in_at: r.checked_in_at,
      checked_out_at: r.checked_out_at ?? null,
      slot: r.slot || null,
      gender: (r.gender as string | null) || (p?.gender as string | null) || null,
      role: primaryRole(uid, (r.role as string | null) || null),
      full_name:
        (r.full_name as string | null) ||
        (p?.full_name as string | null) ||
        (p?.email as string | null) ||
        "Member",
      email: (p?.email as string | null) || null,
      avatar_url: (p?.avatar_url as string | null) || null,
      source: r.source || "manual",
      notes: r.notes ?? null,
      open: !r.checked_out_at,
    };
  });
}

function toCsv(rows: Array<Record<string, unknown>>) {
  const header = [
    "full_name",
    "email",
    "role",
    "gender",
    "slot",
    "checked_in_at",
    "checked_out_at",
    "open",
  ];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(header.map((h) => escape(r[h])).join(","));
  }
  return lines.join("\n");
}

/** GET /api/attendance */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const service = createSupabaseServiceClient();
  if (!service) return jsonError("Server misconfigured", 500);

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") || "me";
  const format = url.searchParams.get("format") || "json";
  const roleFilter = (url.searchParams.get("role") || "all") as
    | "all"
    | "customer"
    | "trainer"
    | "admin";
  const from = url.searchParams.get("from")?.trim() || "";
  const to = url.searchParams.get("to")?.trim() || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "25", 10) || 25),
  );

  const actor = await resolveActor(service, auth.user.id);
  const viewerUserId = auth.user.id;
  const viewGym = canViewGymAttendance({
    isAdmin: actor.canViewGym,
    scope,
  });

  const cacheScopeKey = viewGym
    ? apiCacheKey("attendance", "gym", actor.gymOwnerId || viewerUserId)
    : apiCacheKey("attendance", "user", viewerUserId);
  const listCacheKey = apiCacheKey(
    cacheScopeKey,
    scope,
    roleFilter,
    from || "-",
    to || "-",
    page,
    pageSize,
  );

  async function loadPayload() {
    let query = service
      .from("attendance_checkins")
      .select(
        "id, gym_owner_id, user_id, checked_in_at, checked_out_at, slot, gender, role, full_name, source, notes",
        { count: "exact" },
      )
      .order("checked_in_at", { ascending: false });

    if (viewGym && actor.gymOwnerId) {
      query = query.eq("gym_owner_id", actor.gymOwnerId);
    } else {
      query = query.eq("user_id", viewerUserId);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      query = query.gte("checked_in_at", `${from}T00:00:00.000Z`);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      query = query.lte("checked_in_at", `${to}T23:59:59.999Z`);
    }

    const fetchLimit = viewGym
      ? Math.min(1000, page * pageSize + 200)
      : pageSize * 3;
    query = query.limit(fetchLimit);

    const { data, error, count } = await query;
    if (error) {
      throw new Error(
        error.message.includes("attendance_checkins")
          ? "Run migrations 20260320_attendance_checkins.sql and 20260320_attendance_rls.sql"
          : error.message,
      );
    }

    let checkins = await enrichRows(
      service,
      (data || []) as Array<Record<string, unknown>>,
    );

    if (viewGym && roleFilter !== "all") {
      checkins = checkins.filter((r) =>
        filterByRole(String(r.role), roleFilter),
      );
    }

    const total =
      roleFilter === "all" && count != null ? count : checkins.length;
    const start = (page - 1) * pageSize;
    const pageRows = checkins.slice(start, start + pageSize);

    const slot = currentSlot();
    const genderGate = requireBinaryGender(actor.gender);
    const allowedSlots = genderGate.ok
      ? slotsForGender(genderGate.gender)
      : [];

    const gym =
      actor.gymOwnerId != null
        ? await getGymByOwnerId(actor.gymOwnerId)
        : null;

    return {
      checkins: pageRows,
      allForCsv: checkins,
      meta: {
        gender: actor.gender,
        role: actor.role,
        currentSlot: slot,
        allowedSlots,
        canCheckInNow: Boolean(
          isAttendanceOpen() &&
            genderGate.ok &&
            slot &&
            isSlotAllowedForGender(slot, actor.gender),
        ),
        canViewGym: actor.canViewGym,
        gymOpen: isAttendanceOpen(),
        closedMessage: isAttendanceOpen() ? null : ATTENDANCE_CLOSED_MESSAGE,
        genderRequired: !genderGate.ok,
        genderError: genderGate.ok === false ? genderGate.error : null,
        geoRequired: Boolean(gym?.latitude != null && gym?.longitude != null),
        geoRadiusM: ATTENDANCE_GEO_RADIUS_M,
        checkInCode:
          actor.canViewGym && actor.gymOwnerId
            ? dailyCheckInCode(actor.gymOwnerId)
            : null,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      },
    };
  }

  // CSV is streamed fresh (not cached) so exports stay complete
  if (format === "csv") {
    if (!actor.canViewGym) {
      return jsonError("CSV export is for gym owners only", 403);
    }
    try {
      const payload = await loadPayload();
      const csv = toCsv(payload.allForCsv);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="attendance-${from || "all"}-${to || "all"}.csv"`,
        },
      });
    } catch (e) {
      return jsonError(
        e instanceof Error ? e.message : "Failed to load attendance",
        400,
      );
    }
  }

  try {
    const { data, hit } = await cacheAside(
      listCacheKey,
      ATTENDANCE_CACHE_TTL_MS,
      async () => {
        const payload = await loadPayload();
        return { checkins: payload.checkins, meta: payload.meta };
      },
    );
    return NextResponse.json(data, {
      headers: {
        "X-Cache": hit ? "HIT" : "MISS",
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (e) {
    return jsonError(
      e instanceof Error ? e.message : "Failed to load attendance",
      400,
    );
  }
}

/** POST /api/attendance — check-in */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const service = createSupabaseServiceClient();
  if (!service) return jsonError("Server misconfigured", 500);

  const body = await request.json().catch(() => null);
  const actor = await resolveActor(service, auth.user.id);

  let targetUserId = auth.user.id;
  let targetGymOwnerId = actor.gymOwnerId;
  let targetGender = actor.gender;
  let targetRole = actor.role;
  let targetName = actor.fullName;
  let adminBypass = false;

  if (actor.isAdmin && body?.userId) {
    targetUserId = String(body.userId);
    targetGymOwnerId = actor.gymOwnerId;
    adminBypass = true;
    const { data: targetProfile } = await service
      .from("profiles")
      .select("full_name, gender, gym_owner_id")
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (
      targetProfile?.gym_owner_id &&
      actor.gymOwnerId &&
      targetProfile.gym_owner_id !== actor.gymOwnerId
    ) {
      return jsonError("Member is not in your gym", 403);
    }
    const { data: targetRoles } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId);
    targetGender = (targetProfile?.gender as string | null) || null;
    targetName = (targetProfile?.full_name as string | null) || null;
    const names = (targetRoles || []).map((r) => r.role as string);
    if (names.includes("admin")) targetRole = "admin";
    else if (names.includes("trainer")) targetRole = "trainer";
    else if (names.includes("staff")) targetRole = "staff";
    else targetRole = "customer";
  }

  if (!targetGymOwnerId) {
    return jsonError("Join a gym before checking in", 400);
  }

  if (!isAttendanceOpen()) {
    return jsonError(ATTENDANCE_CLOSED_MESSAGE, 400);
  }

  const genderGate = requireBinaryGender(targetGender);
  if (genderGate.ok === false) {
    return jsonError(genderGate.error, 400);
  }

  const now = new Date();
  const slot = (body?.slot as AttendanceSlot | undefined) || currentSlot(now);
  if (!slot) {
    return jsonError(ATTENDANCE_CLOSED_MESSAGE, 400);
  }

  if (!isSlotAllowedForGender(slot, targetGender)) {
    const allowed = slotsForGender(targetGender).join(", ");
    return jsonError(
      `This slot is not available for your gender. Allowed: ${allowed}`,
      400,
    );
  }

  const liveSlot = currentSlot(now);
  if (!body?.userId && liveSlot !== slot) {
    return jsonError(
      `You can only check in for the current slot (${liveSlot || "closed"})`,
      400,
    );
  }

  const gym = await getGymByOwnerId(targetGymOwnerId);
  const rawLat = body?.lat;
  const rawLng = body?.lng;
  const userLat =
    typeof rawLat === "number"
      ? rawLat
      : rawLat != null && rawLat !== ""
        ? Number(rawLat)
        : null;
  const userLng =
    typeof rawLng === "number"
      ? rawLng
      : rawLng != null && rawLng !== ""
        ? Number(rawLng)
        : null;
  const presence = verifyPresence({
    gymLat: gym?.latitude ?? null,
    gymLng: gym?.longitude ?? null,
    userLat: Number.isFinite(userLat as number) ? (userLat as number) : null,
    userLng: Number.isFinite(userLng as number) ? (userLng as number) : null,
    gymOwnerId: targetGymOwnerId,
    checkInCode: body?.checkInCode ? String(body.checkInCode) : null,
    adminBypass,
  });
  if (presence.ok === false) {
    return jsonError(presence.error, 400);
  }

  const { data: openSession } = await service
    .from("attendance_checkins")
    .select("id, checked_in_at, slot")
    .eq("user_id", targetUserId)
    .eq("gym_owner_id", targetGymOwnerId)
    .is("checked_out_at", null)
    .order("checked_in_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (openSession) {
    return NextResponse.json({
      success: true,
      alreadyCheckedIn: true,
      needsCheckout: true,
      checkin: openSession,
      message: "Already checked in — check out first",
    });
  }

  const { data, error } = await service
    .from("attendance_checkins")
    .insert({
      gym_owner_id: targetGymOwnerId,
      user_id: targetUserId,
      checked_in_at: now.toISOString(),
      slot,
      gender: targetGender,
      role: targetRole,
      full_name: targetName,
      source: body?.source || presence.method || "manual",
      notes: body?.notes || null,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    return jsonError(
      error.message.includes("attendance_checkins")
        ? "Run migrations 20260320_attendance_checkins.sql and 20260320_attendance_rls.sql"
        : error.message,
      400,
    );
  }

  const when = now.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const slotLabel = formatSlotLabel(slot).toLowerCase();
  const who = targetName || "Member";
  const rLabel = roleLabel(targetRole);

  void notify.attendanceCheckedIn(targetUserId, slotLabel, when);
  if (targetGymOwnerId && targetGymOwnerId !== targetUserId) {
    void notify.adminAttendanceCheckedIn(
      [targetGymOwnerId],
      who,
      rLabel,
      slotLabel,
    );
  }

  void invalidateAttendanceCache({
    gymOwnerId: targetGymOwnerId,
    userId: targetUserId,
  });

  return NextResponse.json({
    success: true,
    checkin: data,
    presenceMethod: presence.method,
  });
}

/** PATCH /api/attendance — check out */
export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const service = createSupabaseServiceClient();
  if (!service) return jsonError("Server misconfigured", 500);

  const body = await request.json().catch(() => null);
  const actor = await resolveActor(service, auth.user.id);

  let targetUserId = auth.user.id;
  if (actor.isAdmin && body?.userId) {
    targetUserId = String(body.userId);
  }

  const gymOwnerId = actor.gymOwnerId;
  if (!gymOwnerId) {
    return jsonError("Join a gym before checking out", 400);
  }

  let query = service
    .from("attendance_checkins")
    .select("id, checked_in_at, checked_out_at, user_id")
    .eq("gym_owner_id", gymOwnerId)
    .is("checked_out_at", null)
    .order("checked_in_at", { ascending: false })
    .limit(1);

  if (body?.id) {
    query = service
      .from("attendance_checkins")
      .select("id, checked_in_at, checked_out_at, user_id")
      .eq("id", String(body.id))
      .eq("gym_owner_id", gymOwnerId)
      .is("checked_out_at", null)
      .limit(1);
    if (!actor.isAdmin) {
      query = query.eq("user_id", auth.user.id);
    }
  } else {
    query = query.eq("user_id", targetUserId);
  }

  const { data: openRow, error: findError } = await query.maybeSingle();
  if (findError) return jsonError(findError.message, 400);
  if (!openRow) {
    return jsonError("No open check-in to check out", 400);
  }

  const { data, error } = await service
    .from("attendance_checkins")
    .update({ checked_out_at: new Date().toISOString() })
    .eq("id", (openRow as { id: string }).id)
    .select("*")
    .maybeSingle();

  if (error) return jsonError(error.message, 400);

  const row = data as {
    user_id?: string;
    checked_in_at?: string;
    checked_out_at?: string;
    full_name?: string | null;
    role?: string | null;
  } | null;

  if (row?.checked_in_at && row.checked_out_at) {
    const duration = formatDurationShort(row.checked_in_at, row.checked_out_at);
    const when = new Date(row.checked_out_at).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const memberId = row.user_id || targetUserId;
    const who = row.full_name || "Member";
    const rLabel = roleLabel(row.role || "customer");

    void notify.attendanceCheckedOut(memberId, duration, when);
    if (gymOwnerId && gymOwnerId !== memberId) {
      void notify.adminAttendanceCheckedOut(
        [gymOwnerId],
        who,
        rLabel,
        duration,
      );
    }
  }

  void invalidateAttendanceCache({
    gymOwnerId,
    userId: row?.user_id || targetUserId,
  });

  return NextResponse.json({ success: true, checkin: data });
}
