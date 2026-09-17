import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { cacheInvalidate } from "@/lib/api-cache";

/** GET /api/gyms/[ownerId]/reviews */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ ownerId: string }> },
) {
  const { ownerId } = await ctx.params;
  const service = createSupabaseServiceClient();
  if (!service) return NextResponse.json({ reviews: [], average: null, count: 0 });

  const { data, error } = await service
    .from("gym_reviews" as never)
    .select("id, rating, body, created_at, user_id")
    .eq("gym_owner_id", ownerId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({
      reviews: [],
      average: null,
      count: 0,
      warning: error.message,
    });
  }

  const reviews = (data as { rating: number }[]) || [];
  const count = reviews.length;
  const average =
    count > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : null;

  // Attach names
  const userIds = [...new Set(((data as { user_id: string }[]) || []).map((r) => r.user_id))];
  const names = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await service
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);
    for (const p of profiles || []) {
      names.set(p.user_id, p.full_name || "Member");
    }
  }

  return NextResponse.json({
    reviews: ((data as Record<string, unknown>[]) || []).map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      authorName: names.get(String(r.user_id)) || "Member",
    })),
    average,
    count,
  });
}

/** POST /api/gyms/[ownerId]/reviews — upsert own review */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ ownerId: string }> },
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { ownerId } = await ctx.params;
  const service = createSupabaseServiceClient();
  if (!service) return jsonError("Server misconfigured", 500);

  const body = await request.json().catch(() => null);
  const rating = Number(body?.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return jsonError("Rating must be 1–5", 400);
  }

  const { data: profile } = await service
    .from("profiles")
    .select("gym_owner_id, admin_approved")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (profile?.gym_owner_id !== ownerId || profile?.admin_approved !== true) {
    return jsonError("Only approved members of this gym can review", 403);
  }

  const { data, error } = await service
    .from("gym_reviews" as never)
    .upsert(
      {
        gym_owner_id: ownerId,
        user_id: auth.user.id,
        rating: Math.round(rating),
        body: body?.body ? String(body.body).trim().slice(0, 1000) : null,
        is_published: true,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "gym_owner_id,user_id" },
    )
    .select("*")
    .maybeSingle();

  if (error) return jsonError(error.message, 400);
  cacheInvalidate(`public:gyms`);
  return NextResponse.json({ review: data });
}
