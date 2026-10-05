import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** First + last name initials, e.g. "Hassan Rashid" → "HR" */
export function getNameInitials(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return "U";
}

/** Format auth role for UI: Super Admin | Admin | Trainer | Member */
export function formatRoleName(role: string | undefined, isSuperAdmin: boolean): string {
  if (isSuperAdmin) return "Super Admin";
  if (role === "admin") return "Admin";
  if (role === "trainer") return "Trainer";
  if (role === "staff") return "Staff";
  if (role === "moderator") return "Moderator";
  if (role === "customer" || role === "user") return "Member";
  return role || "Member";
}

/**
 * Calculate peak hours based on operating days and gym opening/closing times.
 * Returns a string showing both the pattern (Weekdays/Weekends/All Day/Custom) and time ranges.
 */
export function calculatePeakHours(
  operatingDays: string[],
  openingTime: string | null,
  closingTime: string | null
): string {
  if (!operatingDays || operatingDays.length === 0) {
    return "";
  }

  const days = new Set(operatingDays);
  const hasWeekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"].some((d) => days.has(d));
  const hasWeekends = ["Sat", "Sun"].some((d) => days.has(d));

  let pattern = "";
  if (days.size === 7) {
    pattern = "All Day";
  } else if (hasWeekdays && !hasWeekends && days.size === 5) {
    pattern = "Weekdays";
  } else if (!hasWeekdays && hasWeekends && days.size === 2) {
    pattern = "Weekends";
  } else {
    pattern = "Custom";
  }

  // Parse opening and closing times to calculate peak time ranges
  const timeRanges = calculatePeakTimeRanges(openingTime, closingTime, pattern);

  return pattern === "Custom" 
    ? timeRanges 
    : `${pattern} • ${timeRanges}`;
}

/**
 * Calculate realistic peak time ranges based on gym operating hours.
 */
function calculatePeakTimeRanges(
  openingTime: string | null,
  closingTime: string | null,
  pattern: string
): string {
  const openHour = parseTimeToHour(openingTime);
  const closeHour = parseTimeToHour(closingTime);

  // Default hours if parsing fails
  const open = openHour ?? 6;
  const close = closeHour ?? 22;

  // Common peak hours patterns based on gym industry standards
  if (pattern === "All Day" || pattern === "Weekdays") {
    // Morning and evening peaks for weekdays
    const morningStart = Math.max(open, 6);
    const morningEnd = Math.min(close, 9);
    const eveningStart = Math.max(open, 17);
    const eveningEnd = Math.min(close, 21);

    if (morningStart < morningEnd && eveningStart < eveningEnd) {
      return `${formatHour(morningStart)}-${formatHour(morningEnd)}, ${formatHour(eveningStart)}-${formatHour(eveningEnd)}`;
    } else if (morningStart < morningEnd) {
      return `${formatHour(morningStart)}-${formatHour(morningEnd)}`;
    } else if (eveningStart < eveningEnd) {
      return `${formatHour(eveningStart)}-${formatHour(eveningEnd)}`;
    }
  } else if (pattern === "Weekends") {
    // More spread out peak hours for weekends
    const lateMorningStart = Math.max(open, 8);
    const lateMorningEnd = Math.min(close, 12);
    const afternoonStart = Math.max(open, 14);
    const afternoonEnd = Math.min(close, 18);

    if (lateMorningStart < lateMorningEnd && afternoonStart < afternoonEnd) {
      return `${formatHour(lateMorningStart)}-${formatHour(lateMorningEnd)}, ${formatHour(afternoonStart)}-${formatHour(afternoonEnd)}`;
    } else if (lateMorningStart < lateMorningEnd) {
      return `${formatHour(lateMorningStart)}-${formatHour(lateMorningEnd)}`;
    } else if (afternoonStart < afternoonEnd) {
      return `${formatHour(afternoonStart)}-${formatHour(afternoonEnd)}`;
    }
  }

  // Fallback: generic peak hours based on operating hours
  const peakStart = Math.max(open, 7);
  const peakEnd = Math.min(close, 20);
  return `${formatHour(peakStart)}-${formatHour(peakEnd)}`;
}

/**
 * Parse time string (e.g., "6:00 AM", "9:30 PM") to hour in 24h format.
 */
function parseTimeToHour(timeStr: string | null): number | null {
  if (!timeStr) return null;

  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();

  if (meridiem === "PM" && hour !== 12) {
    hour += 12;
  } else if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  return hour + minute / 60;
}

/**
 * Format hour (24h) to 12h format (e.g., 6 → "6 AM", 14 → "2 PM").
 */
function formatHour(hour: number): string {
  const h = Math.round(hour);
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}
