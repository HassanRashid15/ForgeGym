"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SuperAdminStatistics } from "@/components/admin/SuperAdminStatistics";
import { DashboardSkeleton } from "@/components/loading/DashboardSkeleton";
import { Loader2 } from "lucide-react";

export default function StatisticsPage() {
  const { isSuperAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [isLoading, isSuperAdmin, router]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Redirecting…
      </div>
    );
  }

  return <SuperAdminStatistics />;
}
