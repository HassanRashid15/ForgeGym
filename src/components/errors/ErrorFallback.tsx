"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

type ErrorFallbackProps = {
  error?: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  homeHref?: string;
};

export function ErrorFallback({
  error,
  reset,
  title = "Something went wrong",
  homeHref = "/",
}: ErrorFallbackProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" />
      </div>
      <div className="space-y-2">
        <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {error?.message || "An unexpected error occurred. Please try again."}
        </p>
        {error?.digest ? (
          <p className="font-mono text-xs text-muted-foreground/70">
            Ref: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {reset ? (
          <Button type="button" onClick={reset} className="gap-2">
            <RefreshCw className="size-4" />
            Try again
          </Button>
        ) : null}
        <Button asChild variant="outline" className="gap-2">
          <Link href={homeHref}>
            <Home className="size-4" />
            Go home
          </Link>
        </Button>
      </div>
    </div>
  );
}
