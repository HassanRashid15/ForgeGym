export type AttendanceSlot = "morning" | "afternoon" | "evening";

/** Gym local timezone for slot windows (override with ATTENDANCE_TZ). */
export const ATTENDANCE_TIMEZONE =
  process.env.ATTENDANCE_TZ || process.env.NEXT_PUBLIC_ATTENDANCE_TZ || "Asia/Karachi";

export const ATTENDANCE_SLOT_HOURS: Record<
  AttendanceSlot,
  { label: string; startHour: number; endHour: number }
> = {
  morning: { label: "Morning", startHour: 5, endHour: 11 },
  afternoon: { label: "Afternoon", startHour: 12, endHour: 16 },
  evening: { label: "Evening", startHour: 17, endHour: 23 },
};

/** Normalize profile gender to male | female | other */
export function normalizeGender(gender: string | null | undefined): "male" | "female" | "other" {
  const g = String(gender || "")
    .trim()
    .toLowerCase();
  if (g === "male" || g === "m") return "male";
  if (g === "female" || g === "f") return "female";
  return "other";
}

/** Slots allowed by gender: female all three; male morning + evening only. */
export function slotsForGender(gender: string | null | undefined): AttendanceSlot[] {
  const g = normalizeGender(gender);
  if (g === "male") return ["morning", "evening"];
  return ["morning", "afternoon", "evening"];
}

export function hourInTimezone(now = new Date(), timeZone = ATTENDANCE_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    hour12: false,
    timeZone,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? NaN);
  // en-GB can emit "24" for midnight in some engines
  if (!Number.isFinite(hour)) return now.getHours();
  return hour === 24 ? 0 : hour;
}

export function slotFromHour(hour: number): AttendanceSlot | null {
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 16) return "afternoon";
  if (hour >= 17 && hour <= 23) return "evening";
  return null;
}

export function currentSlot(now = new Date()): AttendanceSlot | null {
  return slotFromHour(hourInTimezone(now));
}

export function isSlotAllowedForGender(
  slot: AttendanceSlot,
  gender: string | null | undefined,
): boolean {
  return slotsForGender(gender).includes(slot);
}

export function formatSlotLabel(slot: string | null | undefined): string {
  if (!slot) return "—";
  const key = slot as AttendanceSlot;
  return ATTENDANCE_SLOT_HOURS[key]?.label || slot;
}
