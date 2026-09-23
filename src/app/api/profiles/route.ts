import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { pickAllowedProfileFields } from "@/lib/profiles/allowlist";
import { jsonError } from "@/lib/api/errors";
import { notify } from "@/lib/notify-actions";
import { cacheInvalidate } from "@/lib/api-cache";
import { computeBmi } from "@/lib/bmi";

/** Keep public.gyms catalog media in sync when profile media URLs change. */
async function syncGymCatalogMedia(
  userId: string,
  profile: {
    gym_main_image_url?: string | null;
    gym_optional_images_urls?: string[] | null;
    gym_video_url?: string | null;
    gym_video_file_url?: string | null;
    gym_monthly_fee?: string | null;
    gym_trainer_fee?: string | null;
    gym_latitude?: number | null;
    gym_longitude?: number | null;
    gym_name?: string | null;
    gym_city?: string | null;
  },
) {
  const service = createSupabaseServiceClient();
  if (!service) return;

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if ("gym_main_image_url" in profile) {
    patch.main_image_url = profile.gym_main_image_url ?? null;
  }
  if ("gym_optional_images_urls" in profile) {
    patch.optional_images_urls = profile.gym_optional_images_urls ?? null;
  }
  if ("gym_video_url" in profile) {
    patch.video_url = profile.gym_video_url ?? null;
  }
  if ("gym_video_file_url" in profile) {
    patch.video_file_url = profile.gym_video_file_url ?? null;
  }
  if ("gym_monthly_fee" in profile) {
    patch.monthly_fee = profile.gym_monthly_fee ?? null;
  }
  if ("gym_trainer_fee" in profile) {
    patch.trainer_fee = profile.gym_trainer_fee ?? null;
  }
  if ("gym_latitude" in profile) {
    patch.latitude = profile.gym_latitude ?? null;
  }
  if ("gym_longitude" in profile) {
    patch.longitude = profile.gym_longitude ?? null;
  }
  if ("gym_name" in profile && profile.gym_name) {
    patch.name = profile.gym_name;
  }
  if ("gym_city" in profile) {
    patch.city = profile.gym_city ?? null;
  }

  if (Object.keys(patch).length <= 1) return;

  await service.from("gyms").update(patch as never).eq("owner_user_id", userId);
}

/** GET /api/profiles — current user's profile */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  return NextResponse.json({ profile: data });
}

/** POST /api/profiles — create default profile if missing */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const allowed = pickAllowedProfileFields(body);

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ profile: existing });
  }

  const todayDate = new Date().toISOString().split("T")[0];
  const fallbackName =
    (typeof allowed.full_name === "string" && allowed.full_name) ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Member";

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      user_id: user.id,
      email: user.email,
      full_name: fallbackName,
      membership_status: "active",
      membership_type: "basic",
      join_date: todayDate,
      ...allowed,
    } as never)
    .select()
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  return NextResponse.json({ profile: data }, { status: 201 });
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

  const service = createSupabaseServiceClient();
  const db = service || supabase;

  // Keep BMI in sync whenever weight/height are written
  if ("weight_kg" in allowed || "height_cm" in allowed || "bmi" in allowed) {
    const { data: current } = await db
      .from("profiles")
      .select("weight_kg, height_cm")
      .eq("user_id", user.id)
      .maybeSingle();
    const nextWeight =
      "weight_kg" in allowed
        ? (allowed.weight_kg as number | null)
        : ((current?.weight_kg as number | null) ?? null);
    const nextHeight =
      "height_cm" in allowed
        ? (allowed.height_cm as number | null)
        : ((current?.height_cm as number | null) ?? null);
    (allowed as Record<string, unknown>).bmi = computeBmi(nextWeight, nextHeight);
  }

  let previousTrainerId: string | null = null;
  let gymOwnerIdForNotify: string | null = null;
  let memberName = "A member";
  let trainerRequestPending = false;
  let requestedTrainerId: string | null = null;

  // Customer trainer changes require gym-admin approval (pending request).
  if ("preferred_trainer_id" in allowed) {
    const raw = allowed.preferred_trainer_id;
    const trainerId =
      raw === null || raw === undefined || raw === ""
        ? null
        : String(raw).trim();
    delete (allowed as Record<string, unknown>).preferred_trainer_id;

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
      // Same as current — clear any stale pending request
      (allowed as Record<string, unknown>).trainer_request_pending = false;
      (allowed as Record<string, unknown>).pending_trainer_id = null;
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

      (allowed as Record<string, unknown>).pending_trainer_id = trainerId;
      (allowed as Record<string, unknown>).trainer_request_pending = true;
      trainerRequestPending = true;
      requestedTrainerId = trainerId;
    }
  }

  const updatePayload = {
    ...allowed,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload as never)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return jsonError(error.message, 400);
  }

  if (data) {
    await syncGymCatalogMedia(user.id, allowed);

    if (trainerRequestPending) {
      cacheInvalidate(`membership:me:${user.id}`);
      cacheInvalidate("admin:users:");

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
    } else if (Object.keys(allowed).length > 0) {
      void notify.profileSaved(user.id);
    }

    return NextResponse.json({ profile: data, trainerRequestPending });
  }

  const todayDate = new Date().toISOString().split("T")[0];
  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      user_id: user.id,
      email: user.email,
      full_name:
        (typeof allowed.full_name === "string" && allowed.full_name) ||
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
    await syncGymCatalogMedia(user.id, allowed);
    void notify.profileSaved(user.id);
  }

  return NextResponse.json({ profile: created });
}
