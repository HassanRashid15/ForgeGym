import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { listApprovedGyms } from "@/lib/gyms";
import { getPlatformPublicStats } from "@/lib/platform-stats";
import HomePageClient from "@/components/marketing/HomePageClient";
import { SplashScreen } from "@/components/marketing/SplashScreen";
import { HomeBootSplash } from "@/components/marketing/HomeBootSplash";
import { MarkSplashSeen } from "@/components/marketing/MarkSplashSeen";
import { SPLASH_SEEN_COOKIE } from "@/lib/splash-cookie";
import {
  claimFirstSplashVisit,
  getClientIpFromHeaders,
} from "@/lib/splash-visitors";

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

async function shouldShowHomeSplash(): Promise<boolean> {
  const cookieStore = await cookies();
  if (cookieStore.get(SPLASH_SEEN_COOKIE)?.value === "1") {
    return false;
  }

  const h = await headers();
  const ip = getClientIpFromHeaders(h);
  const { isFirstVisit } = await claimFirstSplashVisit(
    ip,
    h.get("user-agent"),
  );
  return isFirstVisit;
}

/**
 * SSR home — SplashScreen streams only on a visitor's first home visit (IP + cookie).
 * Returning visitors skip the preloader and go straight to content.
 */
export default async function HomePage() {
  const showSplash = await shouldShowHomeSplash();

  if (!showSplash) {
    return (
      <>
        <MarkSplashSeen />
        <Suspense fallback={null}>
          <HomeContent />
        </Suspense>
      </>
    );
  }

  return (
    <HomeBootSplash>
      <SplashScreen />
      <Suspense fallback={null}>
        <HomeContent />
      </Suspense>
    </HomeBootSplash>
  );
}
