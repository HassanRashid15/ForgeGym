import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { pickSocialLinksFromRow } from "@/lib/social-links";

/** Coerce DB number/string coords to finite numbers. */
function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function feeStr(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

export type GymListItem = {
  ownerId: string;
  gymName: string;
  gymType: string | null;
  gymCity: string | null;
  address: string | null;
  facilities: string[];
  services: string[];
  peakHours: string | null;
  capacity: string | null;
  yearsOperating: string | null;
  ownerName: string | null;
  avatarUrl: string | null;
  gymMainImageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  monthlyFee: string | null;
  trainerFee: string | null;
  openingTime: string | null;
  closingTime: string | null;
  operatingDaysSpecific: string[] | null;
};

/** Public gym detail — contact phone for visitors (address comes from list item). */
export type GymDetail = GymListItem & {
  operatingDays: number | null;
  bio: string | null;
  gymMainImageUrl: string | null;
  gymOptionalImagesUrls: string[];
  gymVideoUrl: string | null;
  gymVideoFileUrl: string | null;
  monthlyFee: string | null;
  trainerFee: string | null;
  /** Gym contact number from owner profile */
  phone: string | null;
  /** Optional second contact (emergency_contact on profile) */
  emergencyContact: string | null;
};

/** Public catalog from public.gyms (source of truth). Owner profile used for approval + PII only. */
export async function listApprovedGyms(): Promise<GymListItem[]> {
  const service = createSupabaseServiceClient();
  if (!service) return [];

  const { data: gymRows, error: gymError } = await service
    .from("gyms")
    .select(
      "owner_user_id, name, gym_type, city, facilities, services, peak_hours, member_capacity, years_operating, owner_display_name, avatar_url, main_image_url, latitude, longitude, monthly_fee, trainer_fee, opening_time, closing_time, operating_days_specific",
    )
    .eq("is_published", true)
    .order("name", { ascending: true });

  if (gymError || !gymRows?.length) return [];

  const ownerIds = [...new Set(gymRows.map((row) => row.owner_user_id).filter(Boolean))];
  if (ownerIds.length === 0) return [];

  const { data: adminRoles } = await service
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .in("user_id", ownerIds);

  const validAdminIds = new Set((adminRoles || []).map((r) => r.user_id));

  const { data: ownerProfiles } = await service
    .from("profiles")
    .select("user_id, admin_approved, is_super_admin, address")
    .in("user_id", ownerIds);

  const profileByUser = new Map(
    (ownerProfiles || []).map((p) => [p.user_id, p] as const),
  );

  const validOwnerIds = new Set(
    (ownerProfiles || [])
      .filter((p) => p.admin_approved === true && p.is_super_admin !== true)
      .map((p) => p.user_id),
  );

  const validGyms = gymRows.filter(
    (row) =>
      validAdminIds.has(row.owner_user_id) && validOwnerIds.has(row.owner_user_id),
  );

  return validGyms.map((row) => {
    const profile = profileByUser.get(row.owner_user_id);
    return {
      ownerId: row.owner_user_id,
      gymName: row.name,
      gymType: row.gym_type,
      gymCity: row.city,
      address:
        (profile as { address?: string | null } | undefined)?.address?.trim() ||
        null,
      facilities: row.facilities || [],
      services: row.services || [],
      peakHours: row.peak_hours,
      capacity: row.member_capacity,
      yearsOperating: row.years_operating,
      ownerName: row.owner_display_name,
      avatarUrl: row.avatar_url,
      gymMainImageUrl: row.main_image_url || null,
      latitude: parseCoord(row.latitude),
      longitude: parseCoord(row.longitude),
      monthlyFee: feeStr(row.monthly_fee),
      trainerFee: feeStr(row.trainer_fee),
      openingTime: row.opening_time || null,
      closingTime: row.closing_time || null,
      operatingDaysSpecific: row.operating_days_specific || null,
    };
  });
}

export async function getGymByOwnerId(
  ownerId: string,
): Promise<GymDetail | null> {
  const service = createSupabaseServiceClient();
  if (!service || !ownerId) return null;

  const { data: gymRow, error: gymError } = await service
    .from("gyms")
    .select(
      "owner_user_id, name, gym_type, city, facilities, services, peak_hours, member_capacity, years_operating, operating_days, owner_display_name, avatar_url, bio, is_published, main_image_url, optional_images_urls, video_url, video_file_url, monthly_fee, trainer_fee, latitude, longitude, opening_time, closing_time, operating_days_specific",
    )
    .eq("owner_user_id", ownerId)
    .eq("is_published", true)
    .maybeSingle();

  if (gymError || !gymRow) return null;

  const { data: roleRows } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", ownerId);

  const isAdmin = (roleRows || []).some((r) => r.role === "admin");
  if (!isAdmin) return null;

  const { data: profile } = await service
    .from("profiles")
    .select(
      "admin_approved, is_super_admin, bio, avatar_url, full_name, address, phone, emergency_contact",
    )
    .eq("user_id", ownerId)
    .maybeSingle();

  if (!profile || profile.is_super_admin || !profile.admin_approved) {
    return null;
  }

  return {
    ownerId: gymRow.owner_user_id,
    gymName: gymRow.name || "",
    gymType: gymRow.gym_type,
    gymCity: gymRow.city,
    facilities: gymRow.facilities || [],
    services: gymRow.services || [],
    peakHours: gymRow.peak_hours,
    capacity: gymRow.member_capacity,
    yearsOperating: gymRow.years_operating,
    operatingDays: gymRow.operating_days,
    ownerName: gymRow.owner_display_name || profile.full_name,
    bio: gymRow.bio || profile.bio,
    avatarUrl: gymRow.avatar_url || profile.avatar_url,
    gymMainImageUrl: gymRow.main_image_url || null,
    gymOptionalImagesUrls: (gymRow.optional_images_urls || []).filter(Boolean),
    gymVideoUrl: gymRow.video_url || null,
    gymVideoFileUrl: gymRow.video_file_url || null,
    monthlyFee: feeStr(gymRow.monthly_fee),
    trainerFee: feeStr(gymRow.trainer_fee),
    latitude: parseCoord(gymRow.latitude),
    longitude: parseCoord(gymRow.longitude),
    address: (profile as { address?: string | null }).address?.trim() || null,
    phone: (profile as { phone?: string | null }).phone?.trim() || null,
    emergencyContact:
      (profile as { emergency_contact?: string | null }).emergency_contact?.trim() ||
      null,
    openingTime: gymRow.opening_time || null,
    closingTime: gymRow.closing_time || null,
    operatingDaysSpecific: gymRow.operating_days_specific || null,
  };
}

/** Public trainers linked to a gym (no email/phone PII). */
export type GymTrainerPublic = {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  specialization: string | null;
  bio: string | null;
  yearsExperience: string | null;
  certifications: string[] | null;
};

export async function getGymTrainers(ownerId: string): Promise<GymTrainerPublic[]> {
  const service = createSupabaseServiceClient();
  if (!service || !ownerId) return [];

  const { data: profiles, error } = await service
    .from("profiles")
    .select(
      "user_id, full_name, avatar_url, specialization, trainer_bio, bio, years_experience, certifications, account_status, membership_status, admin_approved",
    )
    .eq("gym_owner_id", ownerId)
    .order("full_name", { ascending: true });

  if (error || !profiles?.length) return [];

  const userIds = profiles.map((p) => p.user_id).filter(Boolean);
  const { data: roleRows } = await service
    .from("user_roles")
    .select("user_id, role")
    .eq("role", "trainer")
    .in("user_id", userIds);

  const trainerIds = new Set((roleRows || []).map((r) => r.user_id));

  return profiles
    .filter((p) => trainerIds.has(p.user_id))
    .filter((p) => {
      const status = String(p.account_status || p.membership_status || "active").toLowerCase();
      return status !== "inactive" && status !== "rejected";
    })
    .filter((p) => (p as { admin_approved?: boolean | null }).admin_approved !== false)
    .map((p) => ({
      userId: p.user_id,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      specialization: p.specialization,
      bio: (p.trainer_bio as string | null) || (p.bio as string | null) || null,
      yearsExperience:
        p.years_experience == null ? null : String(p.years_experience),
      certifications: (p.certifications as string[] | null) || null,
    }));
}

/** All public trainers across published gyms (directory page). */
export type PublicTrainerListItem = GymTrainerPublic & {
  gymOwnerId: string;
  gymName: string;
  gymCity: string | null;
  gymMainImageUrl: string | null;
  skills: string[] | null;
  instagramUrl: string | null;
};

export async function listAllPublicTrainers(): Promise<PublicTrainerListItem[]> {
  const service = createSupabaseServiceClient();
  if (!service) return [];

  const gyms = await listApprovedGyms();
  if (gyms.length === 0) return [];

  const gymByOwner = new Map(gyms.map((g) => [g.ownerId, g] as const));
  const ownerIds = gyms.map((g) => g.ownerId);

  const { data: profiles, error } = await service
    .from("profiles")
    .select(
      "user_id, full_name, avatar_url, specialization, trainer_bio, bio, years_experience, certifications, skills, gym_owner_id, account_status, membership_status, admin_approved, instagram_url",
    )
    .in("gym_owner_id", ownerIds)
    .order("full_name", { ascending: true });

  if (error || !profiles?.length) return [];

  const userIds = profiles.map((p) => p.user_id).filter(Boolean);
  const { data: roleRows } = await service
    .from("user_roles")
    .select("user_id, role")
    .eq("role", "trainer")
    .in("user_id", userIds);

  const trainerIds = new Set((roleRows || []).map((r) => r.user_id));

  return profiles
    .filter((p) => trainerIds.has(p.user_id))
    .filter((p) => {
      const status = String(p.account_status || p.membership_status || "active").toLowerCase();
      return status !== "inactive" && status !== "rejected";
    })
    .filter((p) => (p as { admin_approved?: boolean | null }).admin_approved !== false)
    .map((p) => {
      const ownerId = String(p.gym_owner_id || "");
      const gym = gymByOwner.get(ownerId);
      return {
        userId: p.user_id,
        fullName: p.full_name,
        avatarUrl: p.avatar_url,
        specialization: p.specialization,
        bio: (p.trainer_bio as string | null) || (p.bio as string | null) || null,
        yearsExperience:
          p.years_experience == null ? null : String(p.years_experience),
        certifications: (p.certifications as string[] | null) || null,
        skills: (p.skills as string[] | null) || null,
        gymOwnerId: ownerId,
        gymName: gym?.gymName || "Gym",
        gymCity: gym?.gymCity || null,
        gymMainImageUrl: gym?.gymMainImageUrl || null,
        instagramUrl: (p.instagram_url as string | null) || null,
      };
    })
    .filter((t) => t.gymOwnerId && gymByOwner.has(t.gymOwnerId));
}

/** Public trainer profile by user id (coaching info only — no HR/PII). */
export type PublicTrainerDetail = GymTrainerPublic & {
  gymOwnerId: string | null;
  gymName: string | null;
  gymCity: string | null;
  gymMainImageUrl: string | null;
  skills: string[] | null;
  languages: string[] | null;
  education: string | null;
  availability: string | null;
  workingDays: string | null;
  workingHours: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
};

export async function getPublicTrainerById(
  trainerId: string,
): Promise<PublicTrainerDetail | null> {
  const service = createSupabaseServiceClient();
  if (!service || !trainerId) return null;

  const { data: roleRows } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", trainerId);

  const isTrainer = (roleRows || []).some((r) => r.role === "trainer");
  if (!isTrainer) return null;

  const { data: profile, error } = await service
    .from("profiles")
    .select(
      "user_id, full_name, avatar_url, specialization, trainer_bio, bio, years_experience, certifications, skills, languages, education, availability, working_days, working_hours, gym_owner_id, account_status, membership_status, admin_approved, instagram_url, facebook_url, twitter_url, youtube_url, tiktok_url",
    )
    .eq("user_id", trainerId)
    .maybeSingle();

  if (error || !profile) return null;

  const row = profile as Record<string, unknown>;

  const status = String(
    row.account_status || row.membership_status || "active",
  ).toLowerCase();
  if (status === "inactive" || status === "rejected") return null;
  if (row.admin_approved === false) return null;

  let gymName: string | null = null;
  let gymCity: string | null = null;
  let gymMainImageUrl: string | null = null;
  const gymOwnerId = (row.gym_owner_id as string | null) || null;
  if (gymOwnerId) {
    const { data: gymRow } = await service
      .from("gyms")
      .select("name, city, main_image_url, is_published")
      .eq("owner_user_id", gymOwnerId)
      .maybeSingle();
    if (gymRow?.name && (gymRow as { is_published?: boolean }).is_published !== false) {
      gymName = gymRow.name;
      gymCity = gymRow.city || null;
      gymMainImageUrl = gymRow.main_image_url || null;
    }
  }

  return {
    userId: String(row.user_id),
    fullName: (row.full_name as string | null) || null,
    avatarUrl: (row.avatar_url as string | null) || null,
    specialization: (row.specialization as string | null) || null,
    bio: (row.trainer_bio as string | null) || (row.bio as string | null) || null,
    yearsExperience: (row.years_experience as string | null) || null,
    certifications: (row.certifications as string[] | null) || null,
    gymOwnerId,
    gymName,
    gymCity,
    gymMainImageUrl,
    skills: (row.skills as string[] | null) || null,
    languages: (row.languages as string[] | null) || null,
    education: (row.education as string | null) || null,
    availability: (row.availability as string | null) || null,
    workingDays: (row.working_days as string | null) || null,
    workingHours: (row.working_hours as string | null) || null,
    ...pickSocialLinksFromRow(row),
  };
}
