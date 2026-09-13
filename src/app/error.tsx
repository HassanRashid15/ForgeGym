"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/errors/ErrorFallback";
import { trackException } from "@/lib/monitoring";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackException(error, { boundary: "app-error" });
  }, [error]);

  return (
    <div className="min-h-screen bg-background">
      <ErrorFallback error={error} reset={reset} />
    </div>
  );
}
