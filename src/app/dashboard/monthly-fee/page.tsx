"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { MonthlyUsersTable } from "@/components/admin/MonthlyUsersTable";
import { Loader2 } from "lucide-react";

export default function MonthlyFeePage() {
  const { isAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, isLoading, router]);

  if (isLoading || !isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Monthly Fee</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Members, fee, and days left in the billing month.
        </p>
      </div>

      <MonthlyUsersTable />
    </div>
  );
}
