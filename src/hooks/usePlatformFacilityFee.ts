"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPlatformSettings } from "@/api/auth";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Platform facility / personal monthly fee — live for approved gym admins + superadmin.
 * Refetches when this admin's profile.platform_monthly_fee changes in the DB.
 */
export function usePlatformFacilityFee(enabled = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const instanceId = useRef(Math.random().toString(36).slice(2, 9));

  const query = useQuery({
    queryKey: queryKeys.platformSettings,
    queryFn: fetchPlatformSettings,
    enabled,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!enabled || !user?.id) return;

    const channel = supabase.channel(
      `platform-fee:${user.id}:${instanceId.current}`,
    );

    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.platformSettings,
      });
    };

    channel
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, user?.id, queryClient]);

  return query;
}
