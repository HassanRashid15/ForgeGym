import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { pickAllowedProfileFields } from "@/lib/profiles/allowlist";
import { jsonError } from "@/lib/api/errors";
import { notify } from "@/lib/notify-actions";
import {
  cacheInvalidate,
  cacheAside,
  apiCacheKey,
  CacheTTL,
  withCacheHeaders,
} from "@/lib/api-cache";
import { computeBmi } from "@/lib/bmi";
import {
  extractGymCatalogFromProfilePayload,
  fetchGymByOwnerId,
  mergeProfileWithGymCatalog,
  upsertGymCatalog,
} from "@/lib/gyms/catalog";

async function loadMergedProfile(
  db: {
    from: (table: "profiles") => {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          maybeSingle: () => Promise<{
            data: Record<string, unknown> | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  },
  userId: string,
) {
  const { data: profile, error } = await db
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!profile) return null;

  const gym = await fetchGymByOwnerId(db as never, userId);
  return mergeProfileWithGymCatalog(profile, gym);
}

/** GET /api/profiles — current user's profile (gym_* merged from public.gyms) */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;
  const cacheKey = apiCacheKey("profiles", user.id);

  const { data, hit } = await cacheAside(
    cacheKey,
    CacheTTL.authUser,
    async () => {
      const profile = await loadMergedProfile(db as never, user.id);
      return { profile };
    },
  );

  return NextResponse.json(
    data,
    withCacheHeaders(undefined, Math.floor(CacheTTL.authUser / 1000), hit),
  );
}

/** POST /api/profiles — create default profile if missing */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const allowed = pickAllowedProfileFields(body);
  const { person, gym, hasGymFields } = extractGymCatalogFromProfilePayload(
    allowed as Record<string, unknown>,
  );

  const { data: existing } = await db
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const merged = mergeProfileWithGymCatalog(
      existing as Record<string, unknown>,
      await fetchGymByOwnerId(db as never, user.id),
    );
    return NextResponse.json({ profile: merged });
  }

  const todayDate = new Date().toISOString().split("T")[0];
  const fallbackName =
    (typeof person.full_name === "string" && person.full_name) ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Member";

  const { data, error } = await db
    .from("profiles")
    .insert({
      id: user.id,
      user_id: user.id,
      email: user.email,
      full_name: fallbackName,
      membership_status: "active",
      membership_type: "basic",
      join_date: todayDate,
      ...person,
    } as never)
    .select()
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  if (hasGymFields && service) {
    await upsertGymCatalog(service as never, user.id, gym, {
      bio: (person.bio as string | null) ?? null,
      avatar_url: (person.avatar_url as string | null) ?? null,
      owner_display_name: fallbackName,
      is_published: false,
    });
  }

  const merged = mergeProfileWithGymCatalog(
    data as Record<string, unknown>,
    await fetchGymByOwnerId(db as never, user.id),
  );
  return NextResponse.json({ profile: merged }, { status: 201 });
}

/** PATCH /api/profiles — update current user's profile (creates row if missing) */
export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return jsonError("Invalid body", 400);
  }

  const allowed = pickAllowedProfileFields(body as Record<string, unknown>);
  const { person, gym, hasGymFields } = extractGymCatalogFromProfilePayload(
    allowed as Record<string, unknown>,
  );

  const service = createSupabaseServiceClient();
  const db = service || supabase;

  // Keep BMI in sync whenever weight/height are written
  if ("weight_kg" in person || "height_cm" in person || "bmi" in person) {
    const { data: current } = await db
      .from("profiles")
      .select("weight_kg, height_cm")
      .eq("user_id", user.id)
      .maybeSingle();
    const nextWeight =
      "weight_kg" in person
        ? (person.weight_kg as number | null)
        : ((current?.weight_kg as number | null) ?? null);
    const nextHeight =
      "height_cm" in person
        ? (person.height_cm as number | null)
        : ((current?.height_cm as number | null) ?? null);
    person.bmi = computeBmi(nextWeight, nextHeight);
  }

  let previousTrainerId: string | null = null;
  let gymOwnerIdForNotify: string | null = null;
  let memberName = "A member";
  let trainerRequestPending = false;
  let requestedTrainerId: string | null = null;

  // Customer trainer changes require gym-admin approval (pending request).
  if ("preferred_trainer_id" in person) {
    const raw = person.preferred_trainer_id;
    const trainerId =
      raw === null || raw === undefined || raw === ""
        ? null
        : String(raw).trim();
    delete person.preferred_trainer_id;

    const { data: me } = await db
      .from("profiles")
      .select(
        "gym_owner_id, preferred_trainer_id, full_name, email, fee_concession, trainer_request_pending, pending_trainer_id",
      )
      .eq("user_id", user.id)
      .maybeSingle();
    previousTrainerId = (me?.preferred_trainer_id as string | null) || null;
    gymOwnerIdForNotify = me?.gym_owner_id || null;
    memberName =
      (me?.full_name as string | null) ||
      user.email?.split("@")[0] ||
      "A member";

    if (String(previousTrainerId || "") === String(trainerId || "")) {
      person.trainer_request_pending = false;
      person.pending_trainer_id = null;
    } else {
      if (trainerId) {
        if (!gymOwnerIdForNotify) {
          return jsonError("Join a gym before selecting a trainer", 400);
        }
        const { data: trainerProfile } = await db
          .from("profiles")
          .select("user_id, gym_owner_id")
          .eq("user_id", trainerId)
          .maybeSingle();
        const { data: trainerRoles } = await db
          .from("user_roles")
          .select("role")
          .eq("user_id", trainerId);
        const isTrainer = (trainerRoles || []).some((r) => r.role === "trainer");
        if (
          !trainerProfile ||
          !isTrainer ||
          trainerProfile.gym_owner_id !== gymOwnerIdForNotify
        ) {
          return jsonError("Selected trainer is not available at your gym", 400);
        }
      } else if (!gymOwnerIdForNotify) {
        return jsonError("Join a gym before changing trainer", 400);
      }

      person.pending_trainer_id = trainerId;
      person.trainer_request_pending = true;
      trainerRequestPending = true;
      requestedTrainerId = trainerId;
    }
  }

  const updatePayload = {
    ...person,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("profiles")
    .update(updatePayload as never)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  if (data) {
    if (hasGymFields && service) {
      const { data: roleRows } = await db
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = (roleRows || []).some((r) => r.role === "admin");
      const approved = (data as { admin_approved?: boolean }).admin_approved === true;
      const superAdmin = (data as { is_super_admin?: boolean }).is_super_admin === true;

      await upsertGymCatalog(service as never, user.id, gym, {
        bio: (data as { bio?: string | null }).bio ?? null,
        avatar_url: (data as { avatar_url?: string | null }).avatar_url ?? null,
        owner_display_name: (data as { full_name?: string | null }).full_name ?? null,
        is_published: isAdmin && approved && !superAdmin,
      });
    } else if (service && ("bio" in person || "avatar_url" in person || "full_name" in person)) {
      // Keep owner display fields on gyms in sync even without gym_* patch
      const existingGym = await fetchGymByOwnerId(service as never, user.id);
      if (existingGym) {
        await upsertGymCatalog(service as never, user.id, {}, {
          bio: (data as { bio?: string | null }).bio ?? null,
          avatar_url: (data as { avatar_url?: string | null }).avatar_url ?? null,
          owner_display_name: (data as { full_name?: string | null }).full_name ?? null,
        });
      }
    }

    await cacheInvalidate({ prefixes: ["api-cache:auth-me:", "api-cache:profiles:"] });

    if (trainerRequestPending) {
      await cacheInvalidate({ prefixes: ["api-cache:membership:me:", "api-cache:admin:users:"] });

      let trainerName: string | null = null;
      if (requestedTrainerId) {
        const { data: t } = await db
          .from("profiles")
          .select("full_name")
          .eq("user_id", requestedTrainerId)
          .maybeSingle();
        trainerName = (t?.full_name as string | null) || "Trainer";
      }

      void notify.memberTrainerRequestSent(user.id, trainerName);

      if (gymOwnerIdForNotify) {
        const { data: gymAdmins } = await db
          .from("profiles")
          .select("user_id")
          .eq("gym_owner_id", gymOwnerIdForNotify)
          .eq("admin_approved", true);

        const { data: ownerRoles } = await db
          .from("user_roles")
          .select("user_id, role")
          .eq("role", "admin")
          .in(
            "user_id",
            [
              gymOwnerIdForNotify,
              ...((gymAdmins || []).map((p) => p.user_id) as string[]),
            ].filter(Boolean),
          );

        const adminIds = [
          ...new Set((ownerRoles || []).map((r) => r.user_id).filter(Boolean)),
        ].filter((id) => id !== user.id);

        void notify.adminTrainerRequestPending(adminIds, memberName, trainerName);
      }
    } else if (Object.keys(person).length > 0 || hasGymFields) {
      void notify.profileSaved(user.id);
    }

    const merged = mergeProfileWithGymCatalog(
      data as Record<string, unknown>,
      await fetchGymByOwnerId(db as never, user.id),
    );
    return NextResponse.json({ profile: merged, trainerRequestPending });
  }

  const todayDate = new Date().toISOString().split("T")[0];
  const { data: created, error: insertError } = await db
    .from("profiles")
    .insert({
      id: user.id,
      user_id: user.id,
      email: user.email,
      full_name:
        (typeof person.full_name === "string" && person.full_name) ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Member",
      membership_status: "active",
      membership_type: "basic",
      join_date: todayDate,
      ...updatePayload,
    } as never)
    .select()
    .maybeSingle();

  if (insertError) {
    return jsonError(insertError.message, 400);
  }

  if (created) {
    if (hasGymFields && service) {
      await upsertGymCatalog(service as never, user.id, gym, {
        bio: (created as { bio?: string | null }).bio ?? null,
        avatar_url: (created as { avatar_url?: string | null }).avatar_url ?? null,
        owner_display_name: (created as { full_name?: string | null }).full_name ?? null,
        is_published: false,
      });
    }
    await cacheInvalidate({ prefixes: ["api-cache:auth-me:", "api-cache:profiles:"] });
    void notify.profileSaved(user.id);
  }

  const merged = mergeProfileWithGymCatalog(
    created as Record<string, unknown>,
    await fetchGymByOwnerId(db as never, user.id),
  );
  return NextResponse.json({ profile: merged });
}
