import { listApprovedGyms } from "@/lib/gyms";
import GymsPageClient from "@/components/marketing/GymsPageClient";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = buildPageMetadata({
  title: "Find Partner Gyms Near You",
  description:
    "Browse approved partner gyms on Forge. Filter by city or type to find a place to train.",
  path: "/gyms",
});

export default async function GymsPage() {
  const gyms = await listApprovedGyms();
  return <GymsPageClient gyms={gyms} />;
}
