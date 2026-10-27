"use client";

import { useOwnPlatformFee } from "@/hooks/useOwnPlatformFee";
import { useAuth } from "@/contexts/AuthContext";
import { AdminPlatformFeeCard } from "@/components/admin/AdminPlatformFeeCard";

/**
 * Platform monthly fee offer for self-training platform members (customer dashboard).
 * Updates in real time when super admin sets / resolves the fee.
 */
export function PlatformMemberFeeCard({ enabled = true }: { enabled?: boolean }) {
  const { user } = useAuth();
  const query = useOwnPlatformFee(enabled);

  const fee = query.data?.platformMonthlyFee || null;
  if (!enabled) return null;
  if (!query.isPending && !fee && !query.data?.platformFeeStatus) return null;

  return (
    <AdminPlatformFeeCard
      facilityFee={fee}
      loading={query.isPending && !fee}
      platformFeeStatus={query.data?.platformFeeStatus}
      concessionAmount={query.data?.concessionAmount}
      trial={user?.trial}
    />
  );
}
