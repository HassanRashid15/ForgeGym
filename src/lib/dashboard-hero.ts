/** Shared dashboard / profile hero background resolution. */

export const DASHBOARD_HERO_PRELOADER = "/preloader_logo.png";

export type HeroImageSource = {
  dashboardHeroUrl?: string | null;
  gymMainImageUrl?: string | null;
};

/** Prefer personal hero; fall back to gym main image; else null (show preloader). */
export function resolveDashboardHeroUrl(
  source: HeroImageSource | null | undefined,
): string | null {
  const personal = source?.dashboardHeroUrl?.trim() || "";
  if (personal) return personal;
  const gym = source?.gymMainImageUrl?.trim() || "";
  if (gym) return gym;
  return null;
}
