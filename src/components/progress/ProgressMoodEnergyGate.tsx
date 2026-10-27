"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dumbbell, Loader2, Sparkles } from "lucide-react";
import { localDateISO } from "@/lib/progress-catalog";
import {
  ENERGY_OPTIONS,
  MOOD_OPTIONS,
  moodEnergyStorageKey,
  recommendFromMoodEnergy,
  type EnergyId,
  type MoodId,
  type StoredMoodEnergy,
} from "@/lib/progress-mood";

type Props = {
  open: boolean;
  onComplete: (result: StoredMoodEnergy) => void;
};

export function ProgressMoodEnergyGate({ open, onComplete }: Props) {
  const [step, setStep] = useState<"mood" | "energy" | "result">("mood");
  const [mood, setMood] = useState<MoodId | "">("");
  const [energy, setEnergy] = useState<EnergyId | "">("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    document.getElementById("progress-mood-ssr")?.remove();
  }, []);

  const recommendation = useMemo(() => {
    if (!mood || !energy) return null;
    return recommendFromMoodEnergy(mood, energy);
  }, [mood, energy]);

  if (!open || !hydrated) return null;

  const finish = () => {
    if (!mood || !energy || !recommendation) return;
    const payload: StoredMoodEnergy = {
      mood,
      energy,
      focus: recommendation.focus,
      exercises: recommendation.exercises,
      at: new Date().toISOString(),
    };
    try {
      sessionStorage.setItem(
        moodEnergyStorageKey(localDateISO()),
        JSON.stringify(payload),
      );
    } catch {
      /* ignore */
    }
    onComplete(payload);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-5 rounded-2xl border bg-card p-6 shadow-lg sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Before you train
        </p>

        {step === "mood" ? (
          <>
            <h1 className="font-display text-3xl tracking-wide text-foreground sm:text-4xl">
              What&apos;s your mood today?
            </h1>
            <p className="text-sm text-muted-foreground">
              Pick one — then we&apos;ll ask about energy and suggest exercises.
            </p>
            <div className="space-y-2">
              <Label htmlFor="mood-select">Mood</Label>
              <select
                id="mood-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={mood}
                onChange={(e) => setMood(e.target.value as MoodId | "")}
              >
                <option value="">Select your mood</option>
                {MOOD_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.emoji} {o.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="w-full gap-2"
              disabled={!mood}
              onClick={() => setStep("energy")}
            >
              Next — energy
            </Button>
          </>
        ) : null}

        {step === "energy" ? (
          <>
            <h1 className="font-display text-3xl tracking-wide text-foreground sm:text-4xl">
              How&apos;s your energy?
            </h1>
            <p className="text-sm text-muted-foreground">
              This fine-tunes intensity and which moves we suggest.
            </p>
            <div className="space-y-2">
              <Label htmlFor="energy-select">Energy</Label>
              <select
                id="energy-select"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={energy}
                onChange={(e) => setEnergy(e.target.value as EnergyId | "")}
              >
                <option value="">Select your energy</option>
                {ENERGY_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.emoji} {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep("mood")}
              >
                Back
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={!energy}
                onClick={() => setStep("result")}
              >
                <Sparkles className="h-4 w-4" />
                See exercises
              </Button>
            </div>
          </>
        ) : null}

        {step === "result" && recommendation ? (
          <>
            <h1 className="font-display text-3xl tracking-wide text-foreground sm:text-4xl">
              {recommendation.headline}
            </h1>
            <p className="text-sm text-muted-foreground">{recommendation.blurb}</p>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Focus · {recommendation.focus}
              </p>
              <ul className="space-y-1.5">
                {recommendation.exercises.map((ex) => (
                  <li
                    key={ex}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <Dumbbell className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
            <Button className="w-full gap-2" onClick={finish}>
              Start with these
            </Button>
          </>
        ) : null}

        {step === "result" && !recommendation ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculating…
          </p>
        ) : null}
      </div>
    </div>
  );
}
