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
 * SSR home — SplashScreen is streamed immediately (no await ahead of it).
 * Client keeps the preloader up for 10s, then reveals content.
 */
export default async function HomePage() {
  return (
    <HomeBootSplash>
      <SplashScreen />
      <Suspense fallback={null}>
        <HomeContent />
      </Suspense>
    </HomeBootSplash>
  );
}
