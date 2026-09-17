import type { MetadataRoute } from "next";
import { listApprovedGyms, listAllPublicTrainers } from "@/lib/gyms";
import { resolveSiteUrl } from "@/lib/site-url";

export const revalidate = 3600;

const STATIC_ROUTES: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number }> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/gyms", changeFrequency: "daily", priority: 0.95 },
  { path: "/trainers", changeFrequency: "daily", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/membership", changeFrequency: "weekly", priority: 0.5 },
  { path: "/classes", changeFrequency: "weekly", priority: 0.4 },
  { path: "/equipment", changeFrequency: "weekly", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveSiteUrl().replace(/\/$/, "");
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  let gymEntries: MetadataRoute.Sitemap = [];
  let trainerEntries: MetadataRoute.Sitemap = [];

  try {
    const [gyms, trainers] = await Promise.all([
      listApprovedGyms(),
      listAllPublicTrainers(),
    ]);

    gymEntries = gyms.map((g) => ({
      url: `${base}/gyms/${g.ownerId}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    }));

    trainerEntries = trainers.map((t) => ({
      url: `${base}/trainers/${t.userId}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    /* sitemap still returns static routes if DB is unreachable */
  }

  return [...staticEntries, ...gymEntries, ...trainerEntries];
}
