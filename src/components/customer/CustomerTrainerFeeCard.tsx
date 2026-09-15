"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateMyProfile } from "@/api/profiles";
import { Button } from "@/components/ui/button";
import { Dumbbell, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  feeBreakdownLabel,
  formatCombinedFee,
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
 * Customer: add / change preferred trainer — monthly fee auto-adjusts (gym + trainer).
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
        const [gymRes, trainersRes, profileRes] = await Promise.all([
          fetch(`/api/gyms/${encodeURIComponent(gymOwnerId)}`),
          fetch(`/api/gyms/${encodeURIComponent(gymOwnerId)}/trainers`),
          fetch("/api/profiles", { credentials: "include" }),
        ]);
        const gymData = await gymRes.json().catch(() => ({}));
        const trainersData = await trainersRes.json().catch(() => ({}));
        const profileData = await profileRes.json().catch(() => ({}));
        if (cancelled) return;
        setFees({
          monthlyFee:
            gymData?.gym?.monthlyFee != null ? String(gymData.gym.monthlyFee) : null,
          trainerFee:
            gymData?.gym?.trainerFee != null ? String(gymData.gym.trainerFee) : null,
        });
        setTrainers(Array.isArray(trainersData?.trainers) ? trainersData.trainers : []);
        const preferred =
          profileData?.profile?.preferred_trainer_id ||
          profileData?.preferred_trainer_id ||
          "";
        setSelectedId(preferred ? String(preferred) : "");
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
    () => formatCombinedFee(fees.monthlyFee, fees.trainerFee, withTrainer),
    [fees.monthlyFee, fees.trainerFee, withTrainer],
  );
  const breakdown = useMemo(
    () => feeBreakdownLabel(fees.monthlyFee, fees.trainerFee, withTrainer),
    [fees.monthlyFee, fees.trainerFee, withTrainer],
  );

  if (!gymOwnerId) return null;

  async function saveTrainer(nextId: string) {
    setSaving(true);
    try {
      await updateMyProfile({
        preferred_trainer_id: nextId || null,
      });
      setSelectedId(nextId);
      onTrainerChange?.(nextId);
      toast.success(
        nextId
          ? "Trainer added — monthly fee updated"
          : "Trainer removed — monthly fee updated",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update trainer");
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
        Add a gym trainer anytime. Your monthly fee adjusts automatically
        (gym fee{fees.trainerFee ? " + trainer fee" : ""}).
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading trainers…
        </div>
      ) : (
        <div className="space-y-3">
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={selectedId}
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
              Updating…
            </p>
          ) : null}

          {!compact && selectedId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => void saveTrainer("")}
            >
              Remove trainer
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
