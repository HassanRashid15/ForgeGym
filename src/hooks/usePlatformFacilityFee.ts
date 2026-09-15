"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPlatformSettings } from "@/api/auth";
import { queryKeys } from "@/lib/query-keys";

/** Platform facility fee — readable by approved gym admins + superadmin. */
export function usePlatformFacilityFee(enabled = true) {
  return useQuery({
    queryKey: queryKeys.platformSettings,
    queryFn: fetchPlatformSettings,
    enabled,
    staleTime: 60_000,
  });
}
