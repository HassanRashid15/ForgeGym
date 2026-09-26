import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import type { Database } from "@/integrations/supabase/types";
import { notify } from "@/lib/notify-actions";

type ReviewerRole = "customer" | "admin" | "trainer";
type ReviewType =
  | "general"
  | "service"
  | "facilities"
  | "trainer"
  | "staff"
  | "platform";

const VALID_TYPES: ReviewType[] = [
  "general",
  "service",
  "facilities",
  "trainer",
  "staff",
  "platform",
];

async function resolveReviewerRole(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ReviewerRole> {
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = new Set((roleRows || []).map((r) => r.role));
  if (roles.has("admin")) return "admin";
  if (roles.has("trainer")) return "trainer";
  return "customer";
}

async function canModerateReviews(userId: string, email?: string | null) {
  const service = createSupabaseServiceClient();
  if (!service) return false;

  const [{ data: roleRows }, { data: profile }] = await Promise.all([
    service.from("user_roles").select("role").eq("user_id", userId),
    service
      .from("profiles")
      .select("is_super_admin, email")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const isAdmin = (roleRows || []).some((r) => r.role === "admin");
  const isSuper =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true ||
    email === "superadmin@forge.test" ||
    (profile as { email?: string } | null)?.email === "superadmin@forge.test";

  return isAdmin || isSuper;
}

/** POST /api/reviews — submit feedback (customer / admin / trainer) */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return jsonError("Invalid body", 400);
  }

  const { reviewerName, rating, reviewText, reviewType, gymOwnerId } =
    body as Record<string, unknown>;

  const name = typeof reviewerName === "string" ? reviewerName.trim() : "";
  const text = typeof reviewText === "string" ? reviewText.trim() : "";
  const stars = typeof rating === "number" ? rating : Number(rating);

  if (!name || !text || !Number.isFinite(stars)) {
    return jsonError("reviewerName, rating, and reviewText are required", 400);
  }
  if (stars < 1 || stars > 5) {
    return jsonError("Rating must be between 1 and 5", 400);
  }
  if (text.length > 500) {
    return jsonError("Review text must be 500 characters or less", 400);
  }

  const type = (typeof reviewType === "string" ? reviewType : "general") as ReviewType;
  if (!VALID_TYPES.includes(type)) {
    return jsonError("Invalid review type", 400);
  }

  const reviewerRole = await resolveReviewerRole(supabase, user.id);
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  let resolvedGymOwnerId: string | null =
    typeof gymOwnerId === "string" && gymOwnerId.trim()
      ? gymOwnerId.trim()
      : null;

  // Gym owners review as the gym itself — use their user id as owner key
  if (!resolvedGymOwnerId && reviewerRole === "admin") {
    resolvedGymOwnerId = user.id;
  }

  // Trainers/customers: fall back to profile gym_owner_id
  if (!resolvedGymOwnerId && reviewerRole !== "admin") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("gym_owner_id")
      .eq("user_id", user.id)
      .maybeSingle();
    resolvedGymOwnerId =
      (profile as { gym_owner_id?: string | null } | null)?.gym_owner_id || null;
  }

  try {
    const { data, error } = await db
      .from("reviews" as never)
      .insert({
        user_id: user.id,
        gym_owner_id: resolvedGymOwnerId,
        reviewer_name: name.slice(0, 120),
        reviewer_role: reviewerRole,
        rating: stars,
        review_text: text,
        review_type: type,
        is_approved: false,
        is_featured: false,
      } as never)
      .select()
      .single();

    if (error) {
      return jsonError(error.message, 400);
    }

    void notify.reviewSubmitted(user.id, stars);

    return NextResponse.json({
      success: true,
      review: data,
      message:
        "Review submitted successfully. It will appear on the homepage after approval.",
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to submit review",
      500,
    );
  }
}

/** GET /api/reviews — approved (public), mine, or pending (moderators) */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1),
    50,
  );
  const gymOwnerId = url.searchParams.get("gymOwnerId");
  const scope = url.searchParams.get("scope");

  if (scope === "mine" || scope === "pending") {
    const auth = await requireAuth(request);
    if ("error" in auth) return auth.error;

    if (scope === "pending") {
      const ok = await canModerateReviews(auth.user.id, auth.user.email);
      if (!ok) return jsonError("Forbidden", 403);

      const service = createSupabaseServiceClient();
      if (!service) return jsonError("Server misconfigured", 500);

      const { data, error } = await service
        .from("reviews" as never)
        .select("*")
        .eq("is_approved", false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return jsonError(error.message, 400);
      return NextResponse.json({ reviews: data || [] });
    }

    const service = createSupabaseServiceClient();
    const db = service || auth.supabase;
    const { data, error } = await db
      .from("reviews" as never)
      .select("*")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return jsonError(error.message, 400);
    return NextResponse.json({ reviews: data || [] });
  }

  const service = createSupabaseServiceClient();
  const db = service || createSupabaseServerClient();

  try {
    let query = db
      .from("reviews" as never)
      .select("*")
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (gymOwnerId) {
      query = query.eq("gym_owner_id", gymOwnerId);
    }

    const { data, error } = await query;
    if (error) return jsonError(error.message, 400);

    const rows = ((data as Array<{
      user_id: string;
      gym_owner_id: string | null;
      reviewer_role: string;
      is_featured?: boolean;
    }>) || []).slice().sort((a, b) => {
      const af = a.is_featured ? 1 : 0;
      const bf = b.is_featured ? 1 : 0;
      return bf - af;
    });

    // Resolve gym branding: prefer gym_owner_id; for gym-owner reviews use user_id
    const ownerIds = [
      ...new Set(
        rows
          .map((r) =>
            r.gym_owner_id ||
            (r.reviewer_role === "admin" ? r.user_id : null),
          )
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const gymByOwner = new Map<
      string,
      { name: string; logoUrl: string | null }
    >();

    if (ownerIds.length && service) {
      const [{ data: gymRows }, { data: profileRows }] = await Promise.all([
        service
          .from("gyms")
          .select("owner_user_id, name, main_image_url, avatar_url")
          .in("owner_user_id", ownerIds),
        service
          .from("profiles")
          .select("user_id, gym_name, gym_main_image_url, avatar_url")
          .in("user_id", ownerIds),
      ]);

      for (const p of profileRows || []) {
        const row = p as {
          user_id: string;
          gym_name: string | null;
          gym_main_image_url: string | null;
          avatar_url: string | null;
        };
        if (row.gym_name?.trim()) {
          gymByOwner.set(row.user_id, {
            name: row.gym_name.trim(),
            logoUrl: row.gym_main_image_url || row.avatar_url || null,
          });
        }
      }

      for (const g of gymRows || []) {
        const row = g as {
          owner_user_id: string;
          name: string;
          main_image_url: string | null;
          avatar_url: string | null;
        };
        const prev = gymByOwner.get(row.owner_user_id);
        gymByOwner.set(row.owner_user_id, {
          name: row.name || prev?.name || "Partner gym",
          logoUrl:
            row.avatar_url ||
            row.main_image_url ||
            prev?.logoUrl ||
            null,
        });
      }
    }

    const reviews = rows.map((r) => {
      const key =
        r.gym_owner_id ||
        (r.reviewer_role === "admin" ? r.user_id : null);
      const gym = key ? gymByOwner.get(key) : undefined;
      return {
        ...r,
        gym_name: gym?.name || null,
        gym_logo_url: gym?.logoUrl || null,
      };
    });

    // Full stats across all approved reviews (not just this page)
    let count = reviews.length;
    let average: number | null =
      count > 0
        ? Math.round(
            (reviews.reduce(
              (sum, r) => sum + (Number((r as { rating?: number }).rating) || 0),
              0,
            ) /
              count) *
              10,
          ) / 10
        : null;

    if (service) {
      let statsQuery = service
        .from("reviews" as never)
        .select("rating")
        .eq("is_approved", true);
      if (gymOwnerId) {
        statsQuery = statsQuery.eq("gym_owner_id", gymOwnerId);
      }
      const { data: allRatings } = await statsQuery;
      const ratingRows = (allRatings as { rating: number }[] | null) || [];
      count = ratingRows.length;
      average =
        count > 0
          ? Math.round(
              (ratingRows.reduce((s, r) => s + (Number(r.rating) || 0), 0) /
                count) *
                10,
            ) / 10
          : null;
    }

    return NextResponse.json({ reviews, average, count });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to fetch reviews",
      500,
    );
  }
}

/** PATCH /api/reviews — owner edit, or moderator approve/feature/reject */
export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const service = createSupabaseServiceClient();
  if (!service) return jsonError("Server misconfigured", 500);

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Invalid body", 400);

  const {
    id,
    isApproved,
    isFeatured,
    reject,
    rating,
    reviewText,
    reviewType,
  } = body as {
    id?: string;
    isApproved?: boolean;
    isFeatured?: boolean;
    reject?: boolean;
    rating?: number;
    reviewText?: string;
    reviewType?: string;
  };

  if (!id || typeof id !== "string") {
    return jsonError("id is required", 400);
  }

  const isModerator = await canModerateReviews(auth.user.id, auth.user.email);
  const isOwnerEdit =
    rating !== undefined ||
    reviewText !== undefined ||
    reviewType !== undefined;

  // Owner editing their own review
  if (isOwnerEdit && !isModerator) {
    const { data: existing, error: findErr } = await service
      .from("reviews" as never)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (findErr) return jsonError(findErr.message, 400);
    if (!existing) return jsonError("Review not found", 404);

    const row = existing as { user_id: string };
    if (row.user_id !== auth.user.id) {
      return jsonError("Forbidden", 403);
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      // Re-approval required after edit
      is_approved: false,
      is_featured: false,
    };

    if (rating !== undefined) {
      const stars = typeof rating === "number" ? rating : Number(rating);
      if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
        return jsonError("Rating must be between 1 and 5", 400);
      }
      patch.rating = stars;
    }

    if (reviewText !== undefined) {
      const text = String(reviewText).trim();
      if (!text) return jsonError("reviewText is required", 400);
      if (text.length > 500) {
        return jsonError("Review text must be 500 characters or less", 400);
      }
      patch.review_text = text;
    }

    if (reviewType !== undefined) {
      if (!VALID_TYPES.includes(reviewType as ReviewType)) {
        return jsonError("Invalid review type", 400);
      }
      patch.review_type = reviewType;
    }

    const { data, error } = await service
      .from("reviews" as never)
      .update(patch as never)
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .select()
      .single();

    if (error) return jsonError(error.message, 400);
    return NextResponse.json({
      success: true,
      review: data,
      message: "Updated. It will go live again after approval.",
    });
  }

  if (!isModerator) return jsonError("Forbidden", 403);

  if (reject === true) {
    const { error } = await service.from("reviews" as never).delete().eq("id", id);
    if (error) return jsonError(error.message, 400);
    return NextResponse.json({ success: true, deleted: true });
  }

  // Moderator can also edit content while approving
  if (isOwnerEdit) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (rating !== undefined) {
      const stars = typeof rating === "number" ? rating : Number(rating);
      if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
        return jsonError("Rating must be between 1 and 5", 400);
      }
      patch.rating = stars;
    }
    if (reviewText !== undefined) {
      const text = String(reviewText).trim();
      if (!text) return jsonError("reviewText is required", 400);
      patch.review_text = text.slice(0, 500);
    }
    if (reviewType !== undefined) {
      if (!VALID_TYPES.includes(reviewType as ReviewType)) {
        return jsonError("Invalid review type", 400);
      }
      patch.review_type = reviewType;
    }
    if (typeof isApproved === "boolean") patch.is_approved = isApproved;
    if (typeof isFeatured === "boolean") patch.is_featured = isFeatured;

    const { data, error } = await service
      .from("reviews" as never)
      .update(patch as never)
      .eq("id", id)
      .select()
      .single();

    if (error) return jsonError(error.message, 400);
    return NextResponse.json({ success: true, review: data });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof isApproved === "boolean") patch.is_approved = isApproved;
  if (typeof isFeatured === "boolean") patch.is_featured = isFeatured;

  if (Object.keys(patch).length <= 1) {
    return jsonError("Nothing to update", 400);
  }

  const { data, error } = await service
    .from("reviews" as never)
    .update(patch as never)
    .eq("id", id)
    .select()
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ success: true, review: data });
}

/** DELETE /api/reviews?id=… — owner deletes own review */
export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const service = createSupabaseServiceClient();
  if (!service) return jsonError("Server misconfigured", 500);

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return jsonError("id is required", 400);

  const isModerator = await canModerateReviews(auth.user.id, auth.user.email);

  const { data: existing, error: findErr } = await service
    .from("reviews" as never)
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (findErr) return jsonError(findErr.message, 400);
  if (!existing) return jsonError("Review not found", 404);

  const row = existing as { user_id: string };
  if (row.user_id !== auth.user.id && !isModerator) {
    return jsonError("Forbidden", 403);
  }

  const { error } = await service.from("reviews" as never).delete().eq("id", id);
  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ success: true, deleted: true });
}
