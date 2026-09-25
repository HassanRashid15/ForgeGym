"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlatformPublicStats } from "@/lib/platform-stats";

/**
 * Keeps home platform / gym member counts fresh via Realtime + silent refetch.
 */
export function useLivePlatformStats(initial?: PlatformPublicStats) {
  const [stats, setStats] = useState<PlatformPublicStats | undefined>(initial);

  useEffect(() => {
    setStats(initial);
  }, [initial]);

  useEffect(() => {
    let debounce = 0;
    let cancelled = false;

    const refetch = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(async () => {
        try {
          const res = await fetch("/api/platform/public-stats", {
            cache: "no-store",
          });
          const data = (await res.json()) as {
            success?: boolean;
            stats?: PlatformPublicStats;
          };
          if (!cancelled && data.success && data.stats) {
            setStats(data.stats);
          }
        } catch {
          // keep last good stats
        }
      }, 350);
    };

    const channel = supabase
      .channel(`home-platform-stats:${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        refetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        refetch,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gyms" },
        refetch,
      )
      .subscribe();

    // Soft poll + refetch when tab becomes visible
    const poll = window.setInterval(refetch, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, []);

  return stats;
}
