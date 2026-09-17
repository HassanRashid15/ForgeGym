import { Skeleton } from "@/components/ui/skeleton";

export default function GymLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative min-h-[78vh] overflow-hidden md:min-h-[88vh]">
        <Skeleton className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
        <div className="container relative z-10 mx-auto flex min-h-[78vh] flex-col justify-end px-4 pb-16 pt-32 md:min-h-[88vh] md:px-6 md:pb-20 lg:px-8">
          <div className="max-w-3xl space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-2xl" />
              <Skeleton className="h-16 w-64" />
            </div>
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-3/4 max-w-xl" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 md:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-8 w-48" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
