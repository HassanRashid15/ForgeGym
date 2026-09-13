"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/errors/ErrorFallback";
import { trackException } from "@/lib/monitoring";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackException(error, { boundary: "dashboard-error" });
  }, [error]);

  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Dashboard error"
      homeHref="/dashboard"
    />
  );
}
