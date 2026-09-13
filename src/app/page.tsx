import { listApprovedGyms } from "@/lib/gyms";
import HomePageClient from "@/components/marketing/HomePageClient";

export const revalidate = 60;

/**
 * SSR home — gyms are fetched on the server so the page is ready
 * the moment the client splash finishes and reveals content.
 */
export default async function HomePage() {
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
