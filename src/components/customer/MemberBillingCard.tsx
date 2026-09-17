"use client";

import { useEffect, useState } from "react";
import { Wallet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Billing = {
  hasGym: boolean;
  daysLeft: number | null;
  periodEnd: string | null;
  feeLabel: string | null;
  dueSoon: boolean;
  overdue: boolean;
  gymName?: string | null;
};

export function MemberBillingCard() {
  const [data, setData] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/membership/me", { credentials: "include" });
        const json = await res.json().catch(() => ({}));
        if (!cancelled && res.ok) setData(json);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <Skeleton className="h-36 w-full rounded-2xl" />;
  }

  if (!data?.hasGym) return null;

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Wallet className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Monthly fee
        </h2>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-3xl text-foreground">
            {data.feeLabel || "Fee not set"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.gymName ? `${data.gymName} · ` : ""}
            {data.daysLeft === null
              ? "Billing period unavailable"
              : data.overdue
                ? "Renewal due today"
                : `${data.daysLeft} day${data.daysLeft === 1 ? "" : "s"} left in cycle`}
          </p>
          {data.periodEnd && (
            <p className="text-xs text-muted-foreground">
              Period ends {new Date(data.periodEnd).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {data.dueSoon || data.overdue ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {data.overdue ? "Due now" : "Due soon"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Current
            </span>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/profile?tab=membership">Details</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
