import { Suspense } from "react";
import { listApprovedGyms } from "@/lib/gyms";
import HomePageClient from "@/components/marketing/HomePageClient";
import { SplashScreen } from "@/components/marketing/SplashScreen";
import { HomeBootSplash } from "@/components/marketing/HomeBootSplash";

export const revalidate = 60;

/**
 * Loads gyms on the server while the SSR splash is already visible.
 */
async function HomeContent() {
  const gyms = await listApprovedGyms();
  const featuredGyms = gyms.slice(0, 6).map((g) => ({
    ownerId: g.ownerId,
    gymName: g.gymName,
    gymType: g.gymType,
    gymCity: g.gymCity,
    gymMainImageUrl: g.gymMainImageUrl,
  }));

  return <HomePageClient featuredGyms={featuredGyms} />;
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
