import type { ProfileUpdatePayload } from "@/api/profiles";

/** Fields a user may set on their own profile via self-service APIs. */
export const PROFILE_SELF_UPDATE_ALLOWLIST = [
  "full_name",
  "phone",
  "address",
  "emergency_contact",
  "bio",
  "date_of_birth",
  "gender",
  "weight_kg",
  "height_cm",
  "bmi",
  "activity_level",
  "fitness_goal",
  "experience_level",
  "target_areas",
  "workout_days_per_week",
  "workout_duration",
  "workout_type",
  "preferred_workout_time",
  "avatar_url",
  // gym_owner_id is NOT self-writable (privilege escalation)
  "gym_name",
  "gym_type",
  "gym_city",
  "gym_years_operating",
  "gym_facilities",
  "gym_operating_days",
  "gym_peak_hours",
  "gym_member_capacity",
  "gym_services",
  "gym_main_image_url",
  "gym_optional_images_urls",
  "gym_video_url",
  "gym_video_file_url",
  "gym_monthly_fee",
  "gym_trainer_fee",
  "gym_latitude",
  "gym_longitude",
  "preferred_trainer_id",
] as const satisfies ReadonlyArray<keyof ProfileUpdatePayload>;

export type ProfileSelfUpdateKey = (typeof PROFILE_SELF_UPDATE_ALLOWLIST)[number];

export function pickAllowedProfileFields(
  body: Record<string, unknown>,
): ProfileUpdatePayload {
  const out: ProfileUpdatePayload = {};
  for (const key of PROFILE_SELF_UPDATE_ALLOWLIST) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      (out as Record<string, unknown>)[key] = body[key];
    }
  }
  return out;
}
