import { Skeleton } from "@/components/ui/skeleton";

interface PageSkeletonProps {
  variant?: "default" | "contact" | "about";
}

export function PageSkeleton({ variant = "default" }: PageSkeletonProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-32 pb-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-16 w-2/3" />
            <Skeleton className="h-6 w-full max-w-2xl" />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          {variant === "contact" ? (
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Contact Info */}
              <div className="space-y-6">
                <Skeleton className="h-6 w-24" />
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Form */}
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
            </div>
          ) : variant === "about" ? (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-3 p-6 border border-border/50 rounded-lg">
                    <Skeleton className="h-12 w-12" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <Skeleton className="h-8 w-40" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            </div>
          ) : (
            /* Default page skeleton */
            <div className="max-w-4xl mx-auto space-y-6">
              <Skeleton className="h-8 w-64" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-3 p-6 border border-border/50 rounded-lg">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
