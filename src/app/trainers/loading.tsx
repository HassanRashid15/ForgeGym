import { TrainerCardSkeleton } from "@/components/loading/TrainerCardSkeleton";

export default function TrainersLoading() {
  return (
    <div className="min-h-screen bg-background px-4 py-24">
      <div className="mx-auto grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <TrainerCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
