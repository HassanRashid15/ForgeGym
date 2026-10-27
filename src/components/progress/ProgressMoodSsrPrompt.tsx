/**
 * Server-rendered first paint for Progress — mood question shows before client JS.
 * Client gate replaces this once hydrated.
 */
export function ProgressMoodSsrPrompt() {
  return (
    <div
      id="progress-mood-ssr"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 shadow-lg sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Before you train
        </p>
        <h1 className="font-display text-3xl tracking-wide text-foreground sm:text-4xl">
          What&apos;s your mood today?
        </h1>
        <p className="text-sm text-muted-foreground">
          Loading options… then we&apos;ll ask about your energy and suggest
          exercises for you.
        </p>
        <div className="h-10 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-3/4 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
