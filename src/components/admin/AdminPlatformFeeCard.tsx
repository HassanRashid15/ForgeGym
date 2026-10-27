"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, Clock, Loader2, CheckCircle2, HandCoins } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrialInfo } from "@/lib/admin-trial";
import { queryKeys } from "@/lib/query-keys";
import {
  acceptPlatformFee,
  requestPlatformFeeConcession,
} from "@/api/auth";
import { useAuth } from "@/contexts/AuthContext";

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
    <div className="min-w-[1.75rem] text-center sm:min-w-[2.1rem]">
      <p className="font-display text-base tabular-nums leading-none text-foreground sm:text-xl">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-0.5 text-[8px] uppercase tracking-wider text-muted-foreground sm:text-[9px]">
        {label}
      </p>
    </div>
  );
}

/**
 * Platform monthly fee set by super admin — shown on gym-owner dashboard.
 * Owner can accept the fee or request a concession (sent back to super admin).
 */
export function AdminPlatformFeeCard({
  facilityFee,
  loading,
  trial,
  platformFeeStatus,
  concessionAmount,
}: {
  facilityFee: string | null;
  loading?: boolean;
  trial?: TrialInfo | null;
  platformFeeStatus?: string | null;
  concessionAmount?: string | null;
}) {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const trialActive = trial?.status === "active";
  const trialExpired = trial?.status === "expired";
  const [countdown, setCountdown] = useState<CountdownParts | null>(() =>
    getCountdown(trialActive ? trial?.endsAt : null),
  );
  const [acting, setActing] = useState(false);
  const [showConcession, setShowConcession] = useState(false);
  const [concessionDraft, setConcessionDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");

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

  const needsResponse =
    !!facilityFee &&
    (platformFeeStatus === "pending_acceptance" ||
      platformFeeStatus === "concession_rejected");
  const pendingConcession = platformFeeStatus === "concession_requested";
  const accepted = platformFeeStatus === "accepted";

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.platformSettings,
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.ownPlatformFee,
      }),
    ]);
  };

  const handleAccept = async () => {
    setActing(true);
    try {
      await acceptPlatformFee();
      toast.success("Fee accepted — 1 month of dashboard access started.");
      await Promise.all([refresh(), refreshUser()]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to accept fee");
    } finally {
      setActing(false);
    }
  };

  const handleRequestConcession = async () => {
    let amount = concessionDraft.trim().replace(/^\$/, "");
    let note = noteDraft.trim();
    // If amount left as offered fee and note is a number, treat note as the request
    const offered = (facilityFee || "").trim().replace(/^\$/, "");
    if (
      (!amount || amount === offered) &&
      note &&
      /^\d+(\.\d+)?$/.test(note)
    ) {
      amount = note;
      note = "";
    }
    if (!amount) {
      toast.error("Enter the monthly amount you want");
      return;
    }
    if (offered && amount === offered) {
      toast.error("Enter a different amount than the offered fee");
      return;
    }
    setActing(true);
    try {
      await requestPlatformFeeConcession(amount, note || undefined);
      toast.success("Concession request sent to super admin.");
      setShowConcession(false);
      setConcessionDraft("");
      setNoteDraft("");
      await refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to request concession",
      );
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-36 w-full rounded-2xl" />;
  }

  return (
    <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm sm:p-5 md:p-6">
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <Wallet className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" />
        <h2 className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:text-sm">
          Platform monthly fee
        </h2>
      </div>

      <div className="min-w-0">
        <p className="font-display text-2xl tracking-wide text-foreground sm:text-3xl">
          {facilityFee ? `$${facilityFee}` : "Not set"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Set by super admin · accept to unlock 1-month access
        </p>
        {accepted ? (
          <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Fee accepted
            {trialActive && trial?.endsAt
              ? ` · access until ${new Date(trial.endsAt).toLocaleDateString()}`
              : " · 1-month access active"}
          </p>
        ) : pendingConcession ? (
          <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            Concession request pending
            {concessionAmount ? ` ($${concessionAmount}/mo)` : ""} — waiting on
            super admin
          </p>
        ) : platformFeeStatus === "concession_rejected" ? (
          <p className="mt-1 text-xs font-medium text-destructive">
            Concession declined — accept the fee or request again
          </p>
        ) : needsResponse && facilityFee ? (
          <p className="mt-1 text-xs font-medium text-primary">
            Accept this fee to unlock 1 month of dashboard access, or request a
            concession
          </p>
        ) : null}
        {trialActive && trial?.endsAt ? (
          <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            <p>
              {countdown && !countdown.done
                ? `${countdown.days} day${countdown.days === 1 ? "" : "s"} left on free trial`
                : "Free trial ending"}
              {" · "}
              Period ends {new Date(trial.endsAt).toLocaleDateString()}
            </p>
            {trial.startsAt ? (
              <p>Started {new Date(trial.startsAt).toLocaleString()}</p>
            ) : null}
          </div>
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

      {needsResponse && facilityFee && !showConcession ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-3 sm:flex-row">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={acting}
            onClick={() => void handleAccept()}
          >
            {acting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Accept fee
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={acting}
            onClick={() => {
              setConcessionDraft("");
              setNoteDraft("");
              setShowConcession(true);
            }}
          >
            <HandCoins className="h-3.5 w-3.5" />
            Request concession
          </Button>
        </div>
      ) : null}

      {needsResponse && facilityFee && showConcession ? (
        <div className="mt-4 space-y-3 border-t border-border/50 pt-3">
          <p className="text-xs text-muted-foreground">
            Offered fee: <span className="font-medium text-foreground">${facilityFee}/mo</span>
            {" — "}enter the amount you want instead.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="concession-amount">Amount you want ($/mo)</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="concession-amount"
                inputMode="decimal"
                placeholder="e.g. 6000"
                className="pl-7"
                value={concessionDraft}
                onChange={(e) => setConcessionDraft(e.target.value)}
                disabled={acting}
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="concession-note">Reason (optional)</Label>
            <Input
              id="concession-note"
              placeholder="Why you need a lower fee"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              disabled={acting}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={acting || !concessionDraft.trim()}
              onClick={() => void handleRequestConcession()}
            >
              {acting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <HandCoins className="h-3.5 w-3.5" />
              )}
              Send to super admin
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={acting}
              onClick={() => setShowConcession(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 border-t border-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit px-0 sm:px-3">
          <Link href="/dashboard/notifications">Details</Link>
        </Button>

        {countdown && trialActive ? (
          <div
            className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 sm:w-auto sm:justify-start sm:gap-2 sm:px-3 ${
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
                <span className="pb-2.5 text-muted-foreground/50 sm:pb-3">:</span>
                <CountdownUnit value={countdown.hours} label="h" />
                <span className="pb-2.5 text-muted-foreground/50 sm:pb-3">:</span>
                <CountdownUnit value={countdown.minutes} label="m" />
                <span className="pb-2.5 text-muted-foreground/50 sm:pb-3">:</span>
                <CountdownUnit value={countdown.seconds} label="s" />
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
