import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type HomePromotion = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
};

function isLive(p: {
  starts_at?: string | null;
  ends_at?: string | null;
}, now: string) {
  const starts = p.starts_at ? String(p.starts_at) : null;
  const ends = p.ends_at ? String(p.ends_at) : null;
  if (starts && starts > now) return false;
  if (ends && ends < now) return false;
  return true;
}

function pickFeatured(promotions: HomePromotion[]): HomePromotion | null {
  if (!promotions.length) return null;
  return promotions.find((p) => Boolean(p.image_url)) || promotions[0];
}

/**
 * SSR fetch for published “show on home” promotions.
 * Same filters as GET /api/promotions — used so the home popup can open without a client round-trip.
 */
export async function getHomePromotionsSSR(): Promise<HomePromotion[]> {
  const service = createSupabaseServiceClient();
  if (!service) return [];

  const now = new Date().toISOString();
  const { data, error } = await service
    .from("platform_promotions" as never)
    .select(
      "id, title, body, cta_label, cta_href, image_url, starts_at, ends_at, created_at",
    )
    .eq("is_published", true)
    .eq("show_on_home", true)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error || !data) return [];

  return ((data as Record<string, unknown>[]) || [])
    .filter((p) =>
      isLive(
        {
          starts_at: p.starts_at as string | null | undefined,
          ends_at: p.ends_at as string | null | undefined,
        },
        now,
      ),
    )
    .map((p) => ({
      id: String(p.id),
      title: String(p.title || ""),
      body: String(p.body || ""),
      cta_label: (p.cta_label as string | null) ?? null,
      cta_href: (p.cta_href as string | null) ?? null,
      image_url: (p.image_url as string | null) ?? null,
    }));
}

export async function getFeaturedHomePromotionSSR(): Promise<HomePromotion | null> {
  const promotions = await getHomePromotionsSSR();
  return pickFeatured(promotions);
}
