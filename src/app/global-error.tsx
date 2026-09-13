"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/errors/ErrorFallback";
import { trackException } from "@/lib/monitoring";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackException(error, { boundary: "global-error" });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-50">
        <ErrorFallback
          error={error}
          reset={reset}
          title="Application error"
        />
      </body>
    </html>
  );
}
