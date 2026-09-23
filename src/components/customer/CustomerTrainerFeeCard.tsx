"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMyProfile, updateMyProfile } from "@/api/profiles";
import { getGym, getGymTrainers } from "@/api/gyms";
import { Button } from "@/components/ui/button";
import { Dumbbell, Loader2, Wallet, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  feeBreakdownLabel,
  formatCombinedFee,
  formatMemberFee,
} from "@/lib/fees";

type GymTrainerOption = {
  userId: string;
  fullName: string | null;
  specialization: string | null;
};

type GymFees = {
  monthlyFee: string | null;
  trainerFee: string | null;
};

/**
 * Customer: request preferred trainer — admin must approve before fee updates.
 */
export function CustomerTrainerFeeCard({
  compact = false,
  onTrainerChange,
}: {
  compact?: boolean;
  onTrainerChange?: (trainerId: string) => void;
}) {
  const { user } = useAuth();
  const gymOwnerId = user?.gymOwnerId || null;
  const [trainers, setTrainers] = useState<GymTrainerOption[]>([]);
  const [fees, setFees] = useState<GymFees>({ monthlyFee: null, trainerFee: null });
  const [selectedId, setSelectedId] = useState<string>("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [requestPending, setRequestPending] = useState(false);
  const [feeConcession, setFeeConcession] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!gymOwnerId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [gymData, trainersData, profileData] = await Promise.all([
          getGym(gymOwnerId),
          getGymTrainers(gymOwnerId),
          getMyProfile(),
        ]);
        if (cancelled) return;
        const gym = gymData?.gym as {
          monthlyFee?: string | number | null;
          trainerFee?: string | number | null;
        } | undefined;
        setFees({
          monthlyFee: gym?.monthlyFee != null ? String(gym.monthlyFee) : null,
          trainerFee: gym?.trainerFee != null ? String(gym.trainerFee) : null,
        });
        setTrainers(
          Array.isArray(trainersData?.trainers)
            ? (trainersData.trainers as GymTrainerOption[])
            : [],
        );
        const profile = (profileData?.profile || {}) as Record<string, unknown>;
        const preferred = profile?.preferred_trainer_id || "";
        setSelectedId(preferred ? String(preferred) : "");
        setRequestPending(profile?.trainer_request_pending === true);
        setPendingId(
          profile?.pending_trainer_id != null
            ? String(profile.pending_trainer_id)
            : null,
        );
        setFeeConcession(
          profile?.fee_concession != null ? String(profile.fee_concession) : null,
        );
      } catch {
        if (!cancelled) setTrainers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gymOwnerId]);

  const withTrainer = Boolean(selectedId);
  const totalLabel = useMemo(
    () =>
      formatMemberFee(fees.monthlyFee, fees.trainerFee, withTrainer, feeConcession),
    [fees.monthlyFee, fees.trainerFee, withTrainer, feeConcession],
  );
  const breakdown = useMemo(
    () =>
      feeBreakdownLabel(
        fees.monthlyFee,
        fees.trainerFee,
        withTrainer,
        feeConcession,
      ),
    [fees.monthlyFee, fees.trainerFee, withTrainer, feeConcession],
  );

  const previewId = requestPending
    ? pendingId || ""
    : selectedId;
  const previewWithTrainer = Boolean(previewId);
  const previewLabel = useMemo(
    () =>
      formatCombinedFee(fees.monthlyFee, fees.trainerFee, previewWithTrainer),
    [fees.monthlyFee, fees.trainerFee, previewWithTrainer],
  );

  const pendingTrainerLabel = useMemo(() => {
    if (!requestPending) return null;
    if (!pendingId) return "Remove trainer";
    const t = trainers.find((x) => x.userId === pendingId);
    return t
      ? `${t.fullName || "Trainer"}${t.specialization ? ` · ${t.specialization}` : ""}`
      : "Trainer";
  }, [requestPending, pendingId, trainers]);

  if (!gymOwnerId) return null;

  async function saveTrainer(nextId: string) {
    setSaving(true);
    try {
      const res = await updateMyProfile({
        preferred_trainer_id: nextId || null,
      });
      const profile = (res as { profile?: Record<string, unknown> })?.profile;
      const pending = profile?.trainer_request_pending === true;
      setRequestPending(pending);
      setPendingId(
        pending
          ? profile?.pending_trainer_id != null
            ? String(profile.pending_trainer_id)
            : null
          : null,
      );
      if (!pending) {
        setSelectedId(nextId);
        onTrainerChange?.(nextId);
      }
      toast.success(
        nextId
          ? "Trainer request sent — waiting for gym admin approval."
          : "Remove-trainer request sent — waiting for gym admin approval.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not request trainer change");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={
        compact
          ? "rounded-xl border bg-card p-4 shadow-sm"
          : "rounded-2xl border bg-card p-5 shadow-sm sm:p-6"
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <Dumbbell className="h-4 w-4 text-primary" />
        <h2
          className={
            compact
              ? "text-sm font-semibold text-foreground"
              : "text-sm font-semibold uppercase tracking-wider text-muted-foreground"
          }
        >
          {compact ? "Want a trainer?" : "Trainer & monthly fee"}
        </h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Request a gym trainer anytime. Your monthly fee updates after admin approval
        (gym fee{fees.trainerFee ? " + trainer fee" : ""}).
      </p>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : (
        <div className="space-y-3">
          {requestPending ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  Pending admin approval
                </p>
                <p className="text-xs text-muted-foreground">
                  Requested: {pendingTrainerLabel}
                  {previewLabel ? ` · fee would be ${previewLabel}` : ""}
                </p>
              </div>
            </div>
          ) : null}

          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={requestPending ? pendingId || "" : selectedId}
            disabled={saving || trainers.length === 0}
            onChange={(e) => {
              void saveTrainer(e.target.value);
            }}
          >
            <option value="">
              {trainers.length === 0
                ? "No trainers at this gym yet"
                : "No trainer"}
            </option>
            {trainers.map((t) => (
              <option key={t.userId} value={t.userId}>
                {t.fullName || "Trainer"}
                {t.specialization ? ` · ${t.specialization}` : ""}
              </option>
            ))}
          </select>

          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Wallet className="h-3.5 w-3.5 text-primary" />
                Monthly fee
              </span>
              <span className="font-semibold tabular-nums text-foreground">
                {totalLabel || "Not set"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{breakdown}</p>
          </div>

          {saving ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Sending request…
            </p>
          ) : null}

          {!compact && selectedId && !requestPending ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => void saveTrainer("")}
            >
              Request remove trainer
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
