"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrialInfo } from "@/lib/admin-trial";

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

function getCountdown(endsAt: string | null | undefined): CountdownParts | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end)) return null;
  const ms = Math.max(0, end - Date.now());
  const totalSec = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSec / 86_400),
    hours: Math.floor((totalSec % 86_400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    done: totalSec === 0,
  };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[2.1rem] text-center">
      <p className="font-display text-lg tabular-nums leading-none text-foreground sm:text-xl">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

/**
 * Platform monthly fee set by super admin — shown on gym-owner dashboard.
 */
export function AdminPlatformFeeCard({
  facilityFee,
  loading,
  trial,
}: {
  facilityFee: string | null;
  loading?: boolean;
  trial?: TrialInfo | null;
}) {
  const trialActive = trial?.status === "active";
  const trialExpired = trial?.status === "expired";
  const [countdown, setCountdown] = useState<CountdownParts | null>(() =>
    getCountdown(trialActive ? trial?.endsAt : null),
  );

  useEffect(() => {
    if (!trialActive || !trial?.endsAt) {
      setCountdown(null);
      return;
    }
    setCountdown(getCountdown(trial.endsAt));
    const id = window.setInterval(() => {
      setCountdown(getCountdown(trial.endsAt));
    }, 1000);
    return () => window.clearInterval(id);
  }, [trialActive, trial?.endsAt]);

  if (loading) {
    return <Skeleton className="h-36 w-full rounded-2xl" />;
  }

  return (
    <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Platform monthly fee
          </h2>
        </div>
        {countdown && trialActive ? (
          <div
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 sm:gap-2 sm:px-3 ${
              countdown.done
                ? "border-destructive/40 bg-destructive/10"
                : countdown.days <= 7
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-border/60 bg-muted/40"
            }`}
            title={
              trial?.endsAt
                ? `Free trial ends ${new Date(trial.endsAt).toLocaleString()}`
                : "Trial remaining"
            }
          >
            <Clock
              className={`hidden h-3.5 w-3.5 shrink-0 sm:block ${
                countdown.done
                  ? "text-destructive"
                  : countdown.days <= 7
                    ? "text-amber-500"
                    : "text-primary"
              }`}
            />
            {countdown.done ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                Due now
              </p>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <CountdownUnit value={countdown.days} label="d" />
                <span className="pb-3 text-muted-foreground/50">:</span>
                <CountdownUnit value={countdown.hours} label="h" />
                <span className="pb-3 text-muted-foreground/50">:</span>
                <CountdownUnit value={countdown.minutes} label="m" />
                <span className="pb-3 text-muted-foreground/50">:</span>
                <CountdownUnit value={countdown.seconds} label="s" />
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-3xl text-foreground">
            {facilityFee || "Not set"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Set by super admin · owed after free trial
          </p>
          {trialActive && trial?.endsAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {countdown && !countdown.done
                ? `${countdown.days} day${countdown.days === 1 ? "" : "s"} left on free trial`
                : "Free trial ending"}
              {" · "}
              Period ends {new Date(trial.endsAt).toLocaleDateString()}
              {trial.startsAt
                ? ` · Started ${new Date(trial.startsAt).toLocaleString()}`
                : ""}
            </p>
          ) : trialExpired ? (
            <p className="mt-1 text-xs text-primary">
              Free trial ended
              {trial?.endsAt
                ? ` ${new Date(trial.endsAt).toLocaleDateString()}`
                : ""}
              — platform fee applies
            </p>
          ) : trial?.status === "pending_approval" ? (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Fee applies after super admin approval and trial
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/notifications">Details</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
