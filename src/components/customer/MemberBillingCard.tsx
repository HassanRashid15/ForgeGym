"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, AlertTriangle, CheckCircle2, SlidersHorizontal, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CustomerTrainerFeeCard } from "@/components/customer/CustomerTrainerFeeCard";
import { getMyMembership } from "@/api/membership";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Billing = {
  hasGym: boolean;
  daysLeft: number | null;
  periodEnd: string | null;
  periodStart?: string | null;
  joinedAt?: string | null;
  feeLabel: string | null;
  dueSoon: boolean;
  overdue: boolean;
  gymName?: string | null;
  trainerRequestPending?: boolean;
  feeConcession?: string | null;
  hasTrainer?: boolean;
};

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

function getCountdown(periodEnd: string | null): CountdownParts | null {
  if (!periodEnd) return null;
  const end = new Date(periodEnd).getTime();
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
    <div className="min-w-[2.25rem] text-center">
      <p className="font-display text-lg tabular-nums leading-none text-foreground sm:text-xl">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function MemberBillingCard() {
  const { user } = useAuth();
  const [data, setData] = useState<Billing | null>(null);
  const [loading, setLoading] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [countdown, setCountdown] = useState<CountdownParts | null>(null);

  const loadBilling = useCallback(async () => {
    try {
      const json = await getMyMembership();
      setData(json);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadBilling();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadBilling]);

  // Live refresh when admin approves trainer / sets concession
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`member-billing:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadBilling();
        },
      )
      .subscribe();

    const poll = window.setInterval(() => {
      void loadBilling();
    }, 10_000);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [user?.id, loadBilling]);

  useEffect(() => {
    setCountdown(getCountdown(data?.periodEnd ?? null));
    if (!data?.periodEnd) return;
    const id = window.setInterval(() => {
      setCountdown(getCountdown(data.periodEnd));
    }, 1000);
    return () => window.clearInterval(id);
  }, [data?.periodEnd]);

  if (loading) {
    return <Skeleton className="h-36 w-full rounded-2xl" />;
  }

  if (!data?.hasGym) return null;

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Monthly fee
          </h2>
        </div>
        {countdown ? (
          <div
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 sm:gap-2 sm:px-3 ${
              countdown.done || data.overdue
                ? "border-destructive/40 bg-destructive/10"
                : data.dueSoon
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-border/60 bg-muted/40"
            }`}
            title={
              data.periodEnd
                ? `Period ends ${new Date(data.periodEnd).toLocaleString()}`
                : "Billing cycle remaining"
            }
          >
            <Clock
              className={`hidden h-3.5 w-3.5 shrink-0 sm:block ${
                countdown.done || data.overdue
                  ? "text-destructive"
                  : data.dueSoon
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
            {data.feeLabel || "Fee not set"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.gymName || "Your gym"}
            {" · "}
            {countdown?.done || data.overdue
              ? "Renewal due today"
              : countdown
                ? `${countdown.days} day${countdown.days === 1 ? "" : "s"} left in cycle`
                : data.daysLeft === null
                  ? "Billing period unavailable"
                  : `${data.daysLeft} day${data.daysLeft === 1 ? "" : "s"} left in cycle`}
          </p>
          {data.periodEnd && (
            <p className="text-xs text-muted-foreground">
              Period ends {new Date(data.periodEnd).toLocaleDateString()}
              {data.joinedAt
                ? ` · Started ${new Date(data.joinedAt).toLocaleDateString()}`
                : ""}
            </p>
          )}
          {data.feeConcession ? (
            <p className="mt-1 text-xs text-primary">Admin concession applied</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.trainerRequestPending ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              Trainer pending
            </span>
          ) : data.dueSoon || data.overdue ? (
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
          <Button
            type="button"
            variant={adjustOpen ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setAdjustOpen((v) => !v)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Adjust
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/profile?tab=membership">Details</Link>
          </Button>
        </div>
      </div>

      {adjustOpen && (
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Request a trainer change — your gym admin must approve before the fee updates.
          </p>
          <CustomerTrainerFeeCard
            compact
            onTrainerChange={() => {
              void loadBilling();
            }}
          />
        </div>
      )}
    </section>
  );
}
