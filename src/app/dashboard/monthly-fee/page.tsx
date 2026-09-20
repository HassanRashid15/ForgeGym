"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { MonthlyUsersTable } from "@/components/admin/MonthlyUsersTable";
import { TrainerMonthlyFees } from "@/components/trainer/TrainerMonthlyFees";
import { Loader2 } from "lucide-react";

export default function MonthlyFeePage() {
  const { isAdmin, isTrainer, isLoading } = useAuth();
  const router = useRouter();
  const allowed = isAdmin || isTrainer;

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.replace("/dashboard");
    }
  }, [allowed, isLoading, router]);

  if (isLoading || !allowed) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (isTrainer && !isAdmin) {
    return <TrainerMonthlyFees />;
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Monthly Fee</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Members, fee, and days left — adjust trainer here; fee updates live and
          the member is notified.
        </p>
      </div>

      <MonthlyUsersTable />
    </div>
  );
}
