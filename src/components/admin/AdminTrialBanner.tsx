"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <p className="font-display text-lg tabular-nums leading-none text-primary sm:text-xl">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function AdminTrialBanner({
  trial,
  facilityFee,
}: {
  trial: TrialInfo | null | undefined;
  facilityFee?: string | null;
}) {
  const [countdown, setCountdown] = useState<CountdownParts | null>(() =>
    getCountdown(trial?.status === "active" ? trial.endsAt : null),
  );

  useEffect(() => {
    if (trial?.status !== "active" || !trial.endsAt) {
      setCountdown(null);
      return;
    }
    setCountdown(getCountdown(trial.endsAt));
    const id = window.setInterval(() => {
      setCountdown(getCountdown(trial.endsAt));
    }, 1000);
    return () => window.clearInterval(id);
  }, [trial?.status, trial?.endsAt]);

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

  const liveDays = countdown?.done ? 0 : countdown?.days ?? trial.daysLeft;
  const liveLabel =
    liveDays === null
      ? trial.label
      : liveDays === 0 && countdown && !countdown.done
        ? "Less than 1 day left on free trial"
        : liveDays === 1
          ? "1 day left on free trial"
          : `${liveDays} days left on free trial`;

  // active — live countdown from trial_ends_at in DB
  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/10 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Clock className="h-4 w-4" />
            Free trial active
          </p>
          <p className="text-sm text-muted-foreground">
            {liveLabel}
            {trial.endsAt
              ? ` · ends ${new Date(trial.endsAt).toLocaleString()}`
              : ""}
            .
            {facilityFee
              ? ` After trial, platform monthly fee is ${facilityFee}.`
              : " Approved by super admin — countdown is live from your trial start in the database."}
          </p>
          {trial.startsAt ? (
            <p className="text-[11px] text-muted-foreground">
              Started {new Date(trial.startsAt).toLocaleString()}
            </p>
          ) : null}
        </div>

        {countdown ? (
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 sm:gap-2 ${
              countdown.done
                ? "border-destructive/40 bg-destructive/10"
                : (liveDays ?? 99) <= 7
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-primary/40 bg-background/60"
            }`}
            title={
              trial.endsAt
                ? `Trial ends ${new Date(trial.endsAt).toLocaleString()}`
                : "Trial remaining"
            }
          >
            {countdown.done ? (
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-destructive">
                Ended
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
        ) : (
          <div className="rounded-full border border-primary/40 bg-background/60 px-4 py-2 text-center">
            <p className="font-display text-2xl tabular-nums text-primary">
              {trial.daysLeft ?? "—"}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              days left
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
