"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPlatformSettings } from "@/api/auth";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Platform facility / personal monthly fee — live for approved gym admins + superadmin.
 * Updates in near real time when fee / concession status changes.
 */
export function usePlatformFacilityFee(enabled = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const instanceId = useRef(Math.random().toString(36).slice(2, 9));

  const query = useQuery({
    queryKey: queryKeys.platformSettings,
    queryFn: fetchPlatformSettings,
    enabled,
    staleTime: 2_000,
    refetchInterval: enabled ? 4_000 : false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!enabled || !user?.id) return;

    const channel = supabase.channel(
      `platform-fee:${user.id}:${instanceId.current}`,
    );
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void queryClient.invalidateQueries({
          queryKey: queryKeys.platformSettings,
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.ownPlatformFee,
        });
      }, 400);
    };

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "platform_settings",
        },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        refresh,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, user?.id, queryClient]);

  return query;
}
