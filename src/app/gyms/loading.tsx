import { GymCardSkeleton } from "@/components/loading/GymCardSkeleton";

export default function GymsLoading() {
  return (
    <div className="min-h-screen bg-background px-4 py-24">
      <div className="container mx-auto space-y-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <GymCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
