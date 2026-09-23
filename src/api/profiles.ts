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
  bmi?: number | null;
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
  created_at?: string | null;
  avatar_url?: string | null;
  admin_approved?: boolean | null;
  is_super_admin?: boolean | null;
  admin_rejected_at?: string | null;
  approval_requested_at?: string | null;
  is_verified?: boolean | null;
  gym_owner_id?: string | null;
  gym_name?: string | null;
  gym_type?: string | null;
  gym_city?: string | null;
  gym_years_operating?: string | null;
  gym_facilities?: string[] | null;
  gym_operating_days?: number | null;
  gym_peak_hours?: string | null;
  gym_member_capacity?: string | null;
  gym_services?: string[] | null;
  gym_main_image_url?: string | null;
  gym_optional_images_urls?: string[] | null;
  gym_video_url?: string | null;
  gym_video_file_url?: string | null;
  gym_monthly_fee?: string | null;
  gym_trainer_fee?: string | null;
  gym_latitude?: number | null;
  gym_longitude?: number | null;
  preferred_trainer_id?: string | null;
  pending_trainer_id?: string | null;
  trainer_request_pending?: boolean | null;
  fee_concession?: string | null;
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
  bmi: number | null;
  activity_level: string | null;
  fitness_goal: string | null;
  experience_level: string | null;
  target_areas: string[];
  workout_days_per_week: number | null;
  workout_duration: string | null;
  workout_type: string | null;
  preferred_workout_time: string | null;
  avatar_url: string | null;
  gym_name: string | null;
  gym_type: string | null;
  gym_city: string | null;
  gym_years_operating: string | null;
  gym_facilities: string[];
  gym_operating_days: number | null;
  gym_peak_hours: string | null;
  gym_member_capacity: string | null;
  gym_services: string[];
  gym_main_image_url: string | null;
  gym_optional_images_urls: string[] | null;
  gym_video_url: string | null;
  gym_video_file_url: string | null;
  gym_monthly_fee: string | null;
  gym_trainer_fee: string | null;
  gym_latitude: number | null;
  gym_longitude: number | null;
  preferred_trainer_id: string | null;
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

/** POST profiles.uploadGymMedia → /api/gym-media */
export async function uploadGymMedia(
  file: File,
  type: "main-image" | "optional-image" | "logo" | "video",
) {
  const form = new FormData();
  form.append("file", file);
  form.append("type", type);
  return apiRequest<{ url: string; type: string; filename: string }>(
    "profiles",
    "uploadGymMedia",
    {
      body: form,
      timeoutMs: 120_000,
    },
  );
}
