/**
 * Gym catalog helpers — public.gyms is the source of truth for gym attributes.
 * Profile responses may still expose gym_* aliases for UI compatibility.
 */

export const GYM_CATALOG_PROFILE_KEYS = [
  "gym_name",
  "gym_type",
  "gym_city",
  "gym_years_operating",
  "gym_facilities",
  "gym_operating_days",
  "gym_operating_days_specific",
  "gym_peak_hours",
  "gym_opening_time",
  "gym_closing_time",
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
] as const;

export type GymCatalogProfileKey = (typeof GYM_CATALOG_PROFILE_KEYS)[number];

export type GymCatalogRow = {
  owner_user_id: string;
  name: string;
  gym_type: string | null;
  city: string | null;
  facilities: string[] | null;
  services: string[] | null;
  peak_hours: string | null;
  member_capacity: string | null;
  years_operating: string | null;
  operating_days: number | null;
  operating_days_specific: string[] | null;
  opening_time: string | null;
  closing_time: string | null;
  bio: string | null;
  avatar_url: string | null;
  owner_display_name: string | null;
  main_image_url: string | null;
  optional_images_urls: string[] | null;
  video_url: string | null;
  video_file_url: string | null;
  monthly_fee: string | number | null;
  trainer_fee: string | number | null;
  latitude: number | null;
  longitude: number | null;
  is_published?: boolean | null;
};

export type GymCatalogProfileFields = Partial<{
  gym_name: string | null;
  gym_type: string | null;
  gym_city: string | null;
  gym_years_operating: string | null;
  gym_facilities: string[] | null;
  gym_operating_days: number | null;
  gym_operating_days_specific: string[] | null;
  gym_peak_hours: string | null;
  gym_opening_time: string | null;
  gym_closing_time: string | null;
  gym_member_capacity: string | null;
  gym_services: string[] | null;
  gym_main_image_url: string | null;
  gym_optional_images_urls: string[] | null;
  gym_video_url: string | null;
  gym_video_file_url: string | null;
  gym_monthly_fee: string | null;
  gym_trainer_fee: string | null;
  gym_latitude: number | null;
  gym_longitude: number | null;
}>;

function feeToString(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

/** Map a gyms row into legacy profiles.gym_* field names. */
export function gymRowToProfileFields(
  gym: Partial<GymCatalogRow> | null | undefined,
): GymCatalogProfileFields {
  if (!gym) return {};
  return {
    gym_name: gym.name ?? null,
    gym_type: gym.gym_type ?? null,
    gym_city: gym.city ?? null,
    gym_years_operating: gym.years_operating ?? null,
    gym_facilities: gym.facilities ?? null,
    gym_operating_days: gym.operating_days ?? null,
    gym_operating_days_specific: gym.operating_days_specific ?? null,
    gym_peak_hours: gym.peak_hours ?? null,
    gym_opening_time: gym.opening_time ?? null,
    gym_closing_time: gym.closing_time ?? null,
    gym_member_capacity: gym.member_capacity ?? null,
    gym_services: gym.services ?? null,
    gym_main_image_url: gym.main_image_url ?? null,
    gym_optional_images_urls: gym.optional_images_urls ?? null,
    gym_video_url: gym.video_url ?? null,
    gym_video_file_url: gym.video_file_url ?? null,
    gym_monthly_fee: feeToString(gym.monthly_fee),
    gym_trainer_fee: feeToString(gym.trainer_fee),
    gym_latitude: gym.latitude ?? null,
    gym_longitude: gym.longitude ?? null,
  };
}

/** Split profile payload into person fields vs gym catalog fields. */
export function extractGymCatalogFromProfilePayload(
  payload: Record<string, unknown>,
): {
  person: Record<string, unknown>;
  gym: GymCatalogProfileFields;
  hasGymFields: boolean;
} {
  const person: Record<string, unknown> = { ...payload };
  const gym: GymCatalogProfileFields = {};
  let hasGymFields = false;

  for (const key of GYM_CATALOG_PROFILE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(person, key)) {
      (gym as Record<string, unknown>)[key] = person[key];
      delete person[key];
      hasGymFields = true;
    }
  }

  return { person, gym, hasGymFields };
}

/** Build gyms upsert patch from gym_* profile fields (+ optional person display fields). */
export function profileFieldsToGymPatch(
  gym: GymCatalogProfileFields,
  extras?: {
    bio?: string | null;
    avatar_url?: string | null;
    owner_display_name?: string | null;
    is_published?: boolean;
  },
): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if ("gym_name" in gym && gym.gym_name != null) {
    patch.name = String(gym.gym_name).trim();
  }
  if ("gym_type" in gym) patch.gym_type = gym.gym_type ?? null;
  if ("gym_city" in gym) patch.city = gym.gym_city ?? null;
  if ("gym_years_operating" in gym) patch.years_operating = gym.gym_years_operating ?? null;
  if ("gym_facilities" in gym) patch.facilities = gym.gym_facilities ?? [];
  if ("gym_services" in gym) patch.services = gym.gym_services ?? [];
  if ("gym_operating_days" in gym) patch.operating_days = gym.gym_operating_days ?? null;
  if ("gym_operating_days_specific" in gym) {
    patch.operating_days_specific = gym.gym_operating_days_specific ?? null;
  }
  if ("gym_peak_hours" in gym) patch.peak_hours = gym.gym_peak_hours ?? null;
  if ("gym_opening_time" in gym) patch.opening_time = gym.gym_opening_time ?? null;
  if ("gym_closing_time" in gym) patch.closing_time = gym.gym_closing_time ?? null;
  if ("gym_member_capacity" in gym) patch.member_capacity = gym.gym_member_capacity ?? null;
  if ("gym_main_image_url" in gym) patch.main_image_url = gym.gym_main_image_url ?? null;
  if ("gym_optional_images_urls" in gym) {
    patch.optional_images_urls = gym.gym_optional_images_urls ?? null;
  }
  if ("gym_video_url" in gym) patch.video_url = gym.gym_video_url ?? null;
  if ("gym_video_file_url" in gym) patch.video_file_url = gym.gym_video_file_url ?? null;
  if ("gym_monthly_fee" in gym) patch.monthly_fee = gym.gym_monthly_fee ?? null;
  if ("gym_trainer_fee" in gym) patch.trainer_fee = gym.gym_trainer_fee ?? null;
  if ("gym_latitude" in gym) patch.latitude = gym.gym_latitude ?? null;
  if ("gym_longitude" in gym) patch.longitude = gym.gym_longitude ?? null;

  if (extras) {
    if ("bio" in extras) patch.bio = extras.bio ?? null;
    if ("avatar_url" in extras) patch.avatar_url = extras.avatar_url ?? null;
    if ("owner_display_name" in extras) {
      patch.owner_display_name = extras.owner_display_name ?? null;
    }
    if ("is_published" in extras && extras.is_published !== undefined) {
      patch.is_published = extras.is_published;
    }
  }

  return patch;
}

export function mergeProfileWithGymCatalog<T extends Record<string, unknown>>(
  profile: T | null | undefined,
  gym: Partial<GymCatalogRow> | null | undefined,
): T | null {
  if (!profile) return null;
  return { ...profile, ...gymRowToProfileFields(gym) };
}

type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        maybeSingle: () => Promise<{ data: GymCatalogRow | null; error: unknown }>;
      };
      in: (
        col: string,
        vals: string[],
      ) => Promise<{ data: GymCatalogRow[] | null; error: unknown }>;
    };
    upsert: (
      row: Record<string, unknown>,
      opts?: { onConflict?: string },
    ) => Promise<{ error: { message: string } | null }>;
    update: (row: Record<string, unknown>) => {
      eq: (
        col: string,
        val: string,
      ) => Promise<{ error: { message: string } | null }>;
    };
  };
};

const GYM_SELECT =
  "owner_user_id, name, gym_type, city, facilities, services, peak_hours, member_capacity, years_operating, operating_days, operating_days_specific, opening_time, closing_time, bio, avatar_url, owner_display_name, main_image_url, optional_images_urls, video_url, video_file_url, monthly_fee, trainer_fee, latitude, longitude, is_published";

export async function fetchGymByOwnerId(
  db: SupabaseLike,
  ownerUserId: string,
): Promise<GymCatalogRow | null> {
  const { data } = await db
    .from("gyms")
    .select(GYM_SELECT)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  return data;
}

export async function fetchGymsByOwnerIds(
  db: SupabaseLike,
  ownerUserIds: string[],
): Promise<Map<string, GymCatalogRow>> {
  const ids = [...new Set(ownerUserIds.filter(Boolean))];
  const map = new Map<string, GymCatalogRow>();
  if (ids.length === 0) return map;

  const { data } = await db.from("gyms").select(GYM_SELECT).in("owner_user_id", ids);
  for (const row of data || []) {
    map.set(row.owner_user_id, row);
  }
  return map;
}

/** Upsert gym catalog for an owner. Requires a name for insert. */
export async function upsertGymCatalog(
  db: SupabaseLike,
  ownerUserId: string,
  gym: GymCatalogProfileFields,
  extras?: {
    bio?: string | null;
    avatar_url?: string | null;
    owner_display_name?: string | null;
    is_published?: boolean;
  },
): Promise<{ error: string | null }> {
  const patch = profileFieldsToGymPatch(gym, extras);
  const name =
    typeof patch.name === "string" && patch.name.trim()
      ? patch.name.trim()
      : null;

  const existing = await fetchGymByOwnerId(db, ownerUserId);
  if (!existing) {
    if (!name) {
      return { error: null }; // nothing to create yet
    }
    const { error } = await db.from("gyms").upsert(
      {
        owner_user_id: ownerUserId,
        is_published: extras?.is_published ?? false,
        facilities: [],
        services: [],
        ...patch,
        name,
      },
      { onConflict: "owner_user_id" },
    );
    return { error: error?.message ?? null };
  }

  const { error } = await db.from("gyms").update(patch).eq("owner_user_id", ownerUserId);
  return { error: error?.message ?? null };
}

export function enrichProfilesWithGymCatalog<
  T extends { user_id?: string | null; gym_owner_id?: string | null },
>(
  profiles: T[],
  gymsByOwner: Map<string, GymCatalogRow>,
  opts?: { ownerIdField?: "user_id" | "gym_owner_id" | "auto" },
): Array<T & GymCatalogProfileFields> {
  const mode = opts?.ownerIdField ?? "auto";
  return profiles.map((p) => {
    let ownerKey: string | null = null;
    if (mode === "user_id") ownerKey = p.user_id || null;
    else if (mode === "gym_owner_id") ownerKey = p.gym_owner_id || null;
    else {
      // Prefer own gym row (owner), else linked gym via gym_owner_id
      ownerKey =
        (p.user_id && gymsByOwner.has(p.user_id) ? p.user_id : null) ||
        p.gym_owner_id ||
        p.user_id ||
        null;
    }
    const gym = ownerKey ? gymsByOwner.get(ownerKey) : undefined;
    return { ...p, ...gymRowToProfileFields(gym) };
  });
}
