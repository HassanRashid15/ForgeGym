"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function VerifyRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const search = params ? `?${params}` : "";
    router.replace(`/verification${search}${hash}`);
  }, [router, searchParams]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-black text-white gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      <p className="text-sm text-zinc-400">Loading verification...</p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      }
    >
      <VerifyRedirect />
    </Suspense>
  );
}
