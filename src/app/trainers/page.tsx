import { listAllPublicTrainers } from "@/lib/gyms";
import TrainersPageClient from "@/components/marketing/TrainersPageClient";

export const revalidate = 30;

export default async function TrainersPage() {
  const trainers = await listAllPublicTrainers();
  return <TrainersPageClient trainers={trainers} />;
}
