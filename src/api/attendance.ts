import { apiRequest } from "@/api/client";

export type AttendanceCheckin = {
  id: string;
  user_id?: string;
  checked_in_at: string;
  checked_out_at?: string | null;
  open?: boolean;
  role?: string | null;
  slot?: string | null;
  [key: string]: unknown;
};

export type AttendanceMeta = {
  canViewGym?: boolean;
  gender?: string | null;
  genderRequired?: boolean;
  genderError?: string | null;
  gymOpen?: boolean;
  closedMessage?: string | null;
  allowedSlots?: string[];
  currentSlot?: string | null;
  pagination?: { totalPages?: number; page?: number; pageSize?: number };
  [key: string]: unknown;
};

export type AttendanceListResponse = {
  checkins: AttendanceCheckin[];
  meta?: AttendanceMeta | null;
};

export async function listAttendance(
  query: Record<string, string | number | boolean | null | undefined> = {},
) {
  return apiRequest<AttendanceListResponse>("attendance", "list", { query });
}

export async function checkInAttendance(body: {
  source?: string;
  /** Platform self-training: training at a gym vs elsewhere */
  locationMode?: "in_gym" | "not_in_gym";
  lat?: number;
  lng?: number;
  code?: string;
  notes?: string | null;
}) {
  return apiRequest<{
    checkin?: AttendanceCheckin;
    needsCheckout?: boolean;
    presenceMethod?: string;
    error?: string;
  }>("attendance", "checkIn", { body });
}

export async function checkOutAttendance(body: { id?: string } = {}) {
  return apiRequest<{ success?: boolean; error?: string }>("attendance", "update", {
    body,
  });
}
