import { Skeleton } from "@/components/ui/skeleton";

export function GymCardSkeleton() {
  return (
    <div className="glass-card flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="relative aspect-[16/10] overflow-hidden bg-secondary/30">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-2 flex items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}