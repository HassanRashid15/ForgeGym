import { Skeleton } from "@/components/ui/skeleton";

interface DetailPageSkeletonProps {
  variant?: "default" | "dark";
}

export function DetailPageSkeleton({ variant = "default" }: DetailPageSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Hero Image */}
      <Skeleton className="aspect-video w-full rounded-2xl" />
      
      {/* Header */}
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      
      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}