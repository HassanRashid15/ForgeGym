import { listApprovedGyms } from "@/lib/gyms";
import { resolveGymCoordsForSsr } from "@/lib/gyms/resolve-coords-ssr";
import GymsPageClient from "@/components/marketing/GymsPageClient";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = buildPageMetadata({
  title: "Find Partner Gyms Near You",
  description:
    "Browse approved partner gyms on Forge. Sort by distance near you, or filter by city and type.",
  path: "/gyms",
});

export default async function GymsPage() {
  const gyms = await resolveGymCoordsForSsr(await listApprovedGyms());
  return <GymsPageClient gyms={gyms} />;
}
