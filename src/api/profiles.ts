import { apiRequest } from "@/api/client";

export type ProfileRecord = {
  id: string;
  user_id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
  bio?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  activity_level?: string | null;
  fitness_goal?: string | null;
  experience_level?: string | null;
  target_areas?: string[] | null;
  workout_days_per_week?: number | null;
  workout_duration?: string | null;
  workout_type?: string | null;
  preferred_workout_time?: string | null;
  membership_status?: string | null;
  membership_type?: string | null;
  join_date?: string | null;
  avatar_url?: string | null;
};

export type ProfileUpdatePayload = Partial<{
  full_name: string;
  phone: string | null;
  address: string | null;
  emergency_contact: string | null;
  bio: string | null;
  date_of_birth: string | null;
  gender: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  activity_level: string | null;
  fitness_goal: string | null;
  experience_level: string | null;
  target_areas: string[];
  workout_days_per_week: number | null;
  workout_duration: string | null;
  workout_type: string | null;
  preferred_workout_time: string | null;
  avatar_url: string | null;
}>;

/** GET profiles.get → /api/profiles */
export async function getMyProfile() {
  return apiRequest<{ profile: ProfileRecord | null }>("profiles", "get");
}

/** PATCH profiles.update → /api/profiles */
export async function updateMyProfile(payload: ProfileUpdatePayload) {
  return apiRequest<{ profile: ProfileRecord }>("profiles", "update", {
    body: payload,
  });
}

/** POST profiles.create → /api/profiles */
export async function ensureMyProfile(payload?: ProfileUpdatePayload) {
  return apiRequest<{ profile: ProfileRecord }>("profiles", "create", {
    body: payload || {},
  });
}

/** POST profiles.uploadAvatar → /api/profiles/avatar */
export async function uploadMyAvatar(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<{ avatar_url: string }>("profiles", "uploadAvatar", {
    body: form,
    timeoutMs: 30000,
  });
}
