import { listApprovedGyms } from "@/lib/gyms";
import GymsPageClient from "@/components/marketing/GymsPageClient";

export const revalidate = 60;

export const metadata = {
  title: "Find Gyms | Forge Gym",
  description: "Browse approved gyms near you. Filter by city, type, or use your location.",
};

export default async function GymsPage() {
  const gyms = await listApprovedGyms();
  return <GymsPageClient gyms={gyms} />;
}
