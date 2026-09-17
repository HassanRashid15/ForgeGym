import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  cacheGetOrSet,
  CacheTTL,
  withCacheHeaders,
} from "@/lib/api-cache";

/** GET /api/promotions — published home promotions (public, cached) */
export async function GET() {
  const { data: payload, hit } = await cacheGetOrSet(
    "public:promotions",
    CacheTTL.public,
    async () => {
      const service = createSupabaseServiceClient();
      if (!service) return { promotions: [] as Record<string, unknown>[] };

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

      if (error) {
        return { promotions: [] as Record<string, unknown>[], warning: error.message };
      }

      const promotions = ((data as Record<string, unknown>[] | null) || []).filter(
        (p) => {
          const starts = p.starts_at ? String(p.starts_at) : null;
          const ends = p.ends_at ? String(p.ends_at) : null;
          if (starts && starts > now) return false;
          if (ends && ends < now) return false;
          return true;
        },
      );

      return { promotions };
    },
  );

  return NextResponse.json(
    payload,
    withCacheHeaders(undefined, Math.floor(CacheTTL.public / 1000), hit),
  );
}
