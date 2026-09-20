"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SuperAdminStatistics } from "@/components/admin/SuperAdminStatistics";
import { AdminGymStatistics } from "@/components/admin/AdminGymStatistics";
import { DashboardSkeleton } from "@/components/loading/DashboardSkeleton";
import { Loader2 } from "lucide-react";

/**
 * Stats — super admin sees platform facility revenue; gym admin sees their member fees.
 */
export default function StatisticsPage() {
  const { isAdmin, isSuperAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAdmin && !isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAdmin, isSuperAdmin, router]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isSuperAdmin) {
    return <SuperAdminStatistics />;
  }

  if (isAdmin) {
    return <AdminGymStatistics />;
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Redirecting…
    </div>
  );
}
