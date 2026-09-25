import { Suspense } from "react";
import { listApprovedGyms } from "@/lib/gyms";
import { getPlatformPublicStats } from "@/lib/platform-stats";
import HomePageClient from "@/components/marketing/HomePageClient";
import { SplashScreen } from "@/components/marketing/SplashScreen";
import { HomeBootSplash } from "@/components/marketing/HomeBootSplash";

export const revalidate = 60;

/**
 * Loads gyms + live platform stats on the server while the SSR splash is visible.
 */
async function HomeContent() {
  const gyms = await listApprovedGyms();
  const platformStats = await getPlatformPublicStats(gyms);

  const featuredGyms = gyms.slice(0, 6).map((g) => ({
    ownerId: g.ownerId,
    gymName: g.gymName,
    gymType: g.gymType,
    gymCity: g.gymCity,
    address: g.address,
    gymMainImageUrl: g.gymMainImageUrl,
    avatarUrl: g.avatarUrl,
    memberCount: platformStats.memberCountsByOwner[g.ownerId] || 0,
    monthlyFee: g.monthlyFee,
  }));

  return (
    <HomePageClient featuredGyms={featuredGyms} platformStats={platformStats} />
  );
}

/**
 * SplashScreen streams immediately (no await ahead of it). HomeContent loads
 * under Suspense while the splash stays up. Preload links hoist to <head> so
 * splash images start before body paint.
 */
export default function HomePage() {
  return (
    <>
      <link rel="preload" href="/splash_img.png" as="image" fetchPriority="high" />
      <link rel="preload" href="/preloader_logo.png" as="image" fetchPriority="high" />
      <HomeBootSplash>
        <SplashScreen />
        <Suspense fallback={null}>
          <HomeContent />
        </Suspense>
      </HomeBootSplash>
    </>
  );
}
