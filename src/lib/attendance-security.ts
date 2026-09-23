import {
  ATTENDANCE_TIMEZONE,
  hourInTimezone,
  normalizeGender,
  slotFromHour,
  slotsForGender,
  type AttendanceSlot,
} from "@/lib/attendance";

export const ATTENDANCE_GEO_RADIUS_M = Number(
  process.env.ATTENDANCE_GEO_RADIUS_M || 50,
);

export const ATTENDANCE_CLOSED_MESSAGE =
  "Gym attendance is closed from 00:00–04:59 (intended). Open again at 05:00.";

/** Require Male or Female before check-in (slot rules are gender-based). */
export function requireBinaryGender(
  gender: string | null | undefined,
): { ok: true; gender: "male" | "female" } | { ok: false; error: string } {
  const g = normalizeGender(gender);
  if (g === "male" || g === "female") return { ok: true, gender: g };
  return {
    ok: false,
    error:
      "Set your gender to Male or Female in Profile before checking in (required for time slots).",
  };
}

export function isAttendanceOpen(now = new Date()): boolean {
  return slotFromHour(hourInTimezone(now)) != null;
}

/** Haversine distance in meters. */
export function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Local calendar date YYYY-MM-DD in attendance timezone. */
export function localDateISO(now = new Date(), timeZone = ATTENDANCE_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type GeoCheckResult =
  | { ok: true; method: "geo" | "admin_bypass" }
  | { ok: false; error: string };

/**
 * Presence proof: must be within gym GPS radius.
 * Admin check-in for another member may bypass with adminBypass.
 */
export function verifyPresence(params: {
  gymLat: number | null;
  gymLng: number | null;
  userLat?: number | null;
  userLng?: number | null;
  adminBypass?: boolean;
  radiusM?: number;
}): GeoCheckResult {
  if (params.adminBypass) return { ok: true, method: "admin_bypass" };

  const hasGymGeo =
    typeof params.gymLat === "number" &&
    typeof params.gymLng === "number" &&
    Number.isFinite(params.gymLat) &&
    Number.isFinite(params.gymLng);

  if (!hasGymGeo) {
    return {
      ok: false,
      error:
        "Gym GPS is not set. Ask the gym owner to set the gym location in Profile → Gym.",
    };
  }

  const uLat = params.userLat;
  const uLng = params.userLng;
  if (
    typeof uLat !== "number" ||
    typeof uLng !== "number" ||
    !Number.isFinite(uLat) ||
    !Number.isFinite(uLng)
  ) {
    return {
      ok: false,
      error: "Share your location to check in. GPS is required.",
    };
  }

  const dist = distanceMeters(params.gymLat!, params.gymLng!, uLat, uLng);
  const radius = params.radiusM ?? ATTENDANCE_GEO_RADIUS_M;
  if (dist <= radius) return { ok: true, method: "geo" };

  return {
    ok: false,
    error: `You are ~${Math.round(dist)}m from the gym (max ${radius}m). Move closer to check in.`,
  };
}

export function canViewGymAttendance(opts: {
  isAdmin: boolean;
  scope: string;
}): boolean {
  return opts.scope === "gym" && opts.isAdmin;
}

export function filterByRole(
  role: string,
  filter: "all" | "customer" | "trainer" | "admin",
): boolean {
  if (filter === "all") return true;
  if (filter === "admin") return role === "admin";
  if (filter === "trainer") return role === "trainer";
  return (
    role === "customer" ||
    role === "user" ||
    role === "staff" ||
    role === "moderator"
  );
}

export function allowedSlotsForRequiredGender(
  gender: "male" | "female",
): AttendanceSlot[] {
  return slotsForGender(gender);
}
