"use client";

import Link from "next/link";
import { Gift, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TrialInfo } from "@/lib/admin-trial";

export function AdminTrialBanner({
  trial,
  facilityFee,
}: {
  trial: TrialInfo | null | undefined;
  facilityFee?: string | null;
}) {
  if (!trial || trial.status === "none") return null;

  if (trial.status === "pending_approval") {
    return (
      <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
              <Gift className="h-4 w-4" />
              1-month free trial
            </p>
            <p className="text-sm text-muted-foreground">
              Your gym account is waiting for super admin approval. Once approved, your{" "}
              <strong className="text-foreground">30-day free trial</strong> starts
              automatically.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (trial.status === "expired") {
    return (
      <section className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Free trial ended
            </p>
            <p className="text-sm text-muted-foreground">
              Your 1-month trial finished
              {trial.endsAt
                ? ` on ${new Date(trial.endsAt).toLocaleDateString()}`
                : ""}
              .
              {facilityFee
                ? ` Platform facility fee: ${facilityFee}.`
                : " Contact the platform super admin about continuing."}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/notifications">Messages</Link>
          </Button>
        </div>
      </section>
    );
  }

  // active
  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Clock className="h-4 w-4" />
            Free trial active
          </p>
          <p className="text-sm text-muted-foreground">
            {trial.label}
            {trial.endsAt
              ? ` · ends ${new Date(trial.endsAt).toLocaleDateString()}`
              : ""}
            . Approved by super admin — countdown is live on both dashboards.
          </p>
        </div>
        <div className="rounded-full border border-primary/40 bg-background/60 px-4 py-2 text-center">
          <p className="font-display text-2xl tabular-nums text-primary">
            {trial.daysLeft ?? "—"}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            days left
          </p>
        </div>
      </div>
    </section>
  );
}
