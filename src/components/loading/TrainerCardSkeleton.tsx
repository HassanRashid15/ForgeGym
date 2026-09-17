import { Skeleton } from "@/components/ui/skeleton";

export function TrainerCardSkeleton() {
  return (
    <div className="glass-card group h-full overflow-hidden rounded-2xl hover-lift">
      <div className="grid h-full grid-cols-1 lg:grid-cols-2">
        {/* Image */}
        <div className="relative block h-64 overflow-hidden lg:h-full">
          <Skeleton className="h-full w-full" />
        </div>

        {/* Content */}
        <div className="flex flex-col p-8">
          <div className="space-y-2 mb-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-5 w-40" />
          </div>
          
          <div className="mb-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          <div className="mb-6 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          <div className="mb-6 space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-center gap-3 pt-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
