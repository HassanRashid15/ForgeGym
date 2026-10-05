"use client";

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to subscribe to real-time changes in user-related tables.
 * Triggers the provided callback when users are created, updated, or deleted.
 */
export function useLiveUsers(onChange: () => void) {
  useEffect(() => {
    let debounce = 0;
    let cancelled = false;

    const refetch = () => {
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => {
        if (!cancelled) {
          onChange();
        }
      }, 350);
    };

    const channel = supabase
      .channel(`live-users:${Date.now()}`)
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
      .subscribe();

    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
      void supabase.removeChannel(channel);
    };
  }, [onChange]);
}
