"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Wind, Dumbbell, CheckCircle2, X } from "lucide-react";

const REST_SECONDS = 120;
/** Last seconds of breath — prep / motivate for next set. */
const REST_PREP_AT = 10;
/** No response on breathe/start ask → auto-save exercise. */
const ASK_IDLE_AUTO_SAVE_SEC = 10;

const REST_MOTIVATIONS = [
  "Breathe in. You’ve got this.",
  "Shake it out — next set is yours.",
  "Stay loose. Power comes back.",
  "Focus on form for the next reps.",
  "Recover now. Dominate next.",
  "One more round. Stronger every set.",
  "Deep breath. Ready when you are.",
  "Mind clear. Muscles reset.",
];

const REST_PREP_MOTIVATIONS = [
  "Next reps incoming — brace up.",
  "Get set. Stay sharp.",
  "Shake it out. Eyes forward.",
  "Prepare your stance.",
  "Almost time — lock in.",
  "Breathe once more. Then go.",
  "You’re ready for the next set.",
  "Reset. Then own those reps.",
];

const WORK_MOTIVATIONS = [
  "Lock in. Clean reps.",
  "Drive through every rep.",
  "Stronger than yesterday.",
  "Control the weight. Own it.",
  "Eyes up. Full range.",
  "This set counts — make it count.",
  "Squeeze. Don’t rush.",
  "You’re built for this.",
];

const WORK_PUSH_MOTIVATIONS = [
  "Last 10 — push harder!",
  "Finish strong. No quit.",
  "Empty the tank!",
  "One more beat — go!",
  "Leave it all here!",
  "Crush these last reps!",
];

const WORK_PUSH_AT = 10;
/** Get-ready countdown before each work set. */
const PREP_SECONDS = 5;
/** Flash “START / GO” before work begins. */
const GO_FLASH_MS = 1200;

const GO_TEXTS = ["START!", "GO!", "NOW!", "LET'S GO!", "HIT IT!"];

type Phase = "prep" | "go" | "work" | "rest" | "restAsk" | "done";

function pickRandomIndex(length: number, exclude?: number) {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  if (exclude != null && length > 1) {
    while (next === exclude) next = Math.floor(Math.random() * length);
  }
  return next;
}

export type ExerciseSessionPlan = {
  exerciseName: string;
  plannedSets: number;
  reps: number;
  weight: string | null;
  /** Work time per set (seconds). */
  durationSec: number;
};

type Props = {
  open: boolean;
  plan: ExerciseSessionPlan | null;
  saving?: boolean;
  /** Replay guide without saving another log entry. */
  guideOnly?: boolean;
  onCancel: () => void;
  /** Called when user finishes — `completedSets` includes any extras. */
  onFinish: (completedSets: number) => void;
};

function formatClock(totalSec: number) {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return {
    minutes: String(m),
    seconds: r.toString().padStart(2, "0"),
    label: `${m}:${r.toString().padStart(2, "0")}`,
  };
}

export function ExerciseSetSession({
  open,
  plan,
  saving = false,
  guideOnly = false,
  onCancel,
  onFinish,
}: Props) {
  const [phase, setPhase] = useState<Phase>("prep");
  const [currentSet, setCurrentSet] = useState(1);
  const [targetSets, setTargetSets] = useState(1);
  const [remaining, setRemaining] = useState(0);
  const [phaseTotal, setPhaseTotal] = useState(1);
  const [tickEpoch, setTickEpoch] = useState(0);
  const [motivationIndex, setMotivationIndex] = useState(0);
  const [motivationVisible, setMotivationVisible] = useState(true);
  const [prepProgress, setPrepProgress] = useState(0);
  const [goText, setGoText] = useState(GO_TEXTS[0]);
  const [askIdleLeft, setAskIdleLeft] = useState(ASK_IDLE_AUTO_SAVE_SEC);
  const tickRef = useRef<number | null>(null);
  const prepTickRef = useRef<number | null>(null);
  const goTimeoutRef = useRef<number | null>(null);
  const askIdleRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("prep");
  const currentSetRef = useRef(1);
  const targetSetsRef = useRef(1);
  const pendingWorkSecRef = useRef(45);
  const prepStartRef = useRef(0);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  phaseRef.current = phase;
  currentSetRef.current = currentSet;
  targetSetsRef.current = targetSets;

  const clearTick = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const clearPrepTick = () => {
    if (prepTickRef.current) {
      window.clearInterval(prepTickRef.current);
      prepTickRef.current = null;
    }
  };

  const clearGoTimeout = () => {
    if (goTimeoutRef.current) {
      window.clearTimeout(goTimeoutRef.current);
      goTimeoutRef.current = null;
    }
  };

  const clearAskIdle = () => {
    if (askIdleRef.current) {
      window.clearInterval(askIdleRef.current);
      askIdleRef.current = null;
    }
  };

  const startWorkTimer = useCallback((setNumber: number, durationSec: number) => {
    clearTick();
    clearPrepTick();
    clearGoTimeout();
    clearAskIdle();
    setCurrentSet(setNumber);
    setPhase("work");
    setPhaseTotal(durationSec);
    setRemaining(durationSec);
    setTickEpoch((n) => n + 1);
  }, []);

  const flashGoThenWork = useCallback(() => {
    clearTick();
    clearPrepTick();
    clearGoTimeout();
    clearAskIdle();
    setPrepProgress(100);
    setRemaining(0);
    setGoText(GO_TEXTS[pickRandomIndex(GO_TEXTS.length)]);
    setPhase("go");
    goTimeoutRef.current = window.setTimeout(() => {
      startWorkTimer(currentSetRef.current, pendingWorkSecRef.current);
    }, GO_FLASH_MS);
  }, [startWorkTimer]);

  /** 5s get-ready → START flash → work timer. */
  const beginWork = useCallback((setNumber: number, durationSec: number) => {
    clearTick();
    clearPrepTick();
    clearGoTimeout();
    clearAskIdle();
    pendingWorkSecRef.current = durationSec;
    prepStartRef.current = Date.now();
    setCurrentSet(setNumber);
    setPhase("prep");
    setPhaseTotal(PREP_SECONDS);
    setRemaining(PREP_SECONDS);
    setPrepProgress(0);
    setTickEpoch((n) => n + 1);
  }, []);

  const beginRest = useCallback(() => {
    clearTick();
    clearPrepTick();
    clearGoTimeout();
    clearAskIdle();
    setPhase("rest");
    setPhaseTotal(REST_SECONDS);
    setRemaining(REST_SECONDS);
    setTickEpoch((n) => n + 1);
  }, []);

  const openRestAsk = useCallback(() => {
    clearTick();
    clearPrepTick();
    clearGoTimeout();
    clearAskIdle();
    setPhase("restAsk");
    setRemaining(0);
    setAskIdleLeft(ASK_IDLE_AUTO_SAVE_SEC);
  }, []);

  const onTimerComplete = useCallback(() => {
    clearTick();
    const p = phaseRef.current;
    if (p === "work") {
      beginRest();
      return;
    }
    if (p === "rest") {
      openRestAsk();
    }
  }, [beginRest, openRestAsk]);

  useEffect(() => {
    if (!open || !plan) {
      clearTick();
      clearPrepTick();
      clearGoTimeout();
      clearAskIdle();
      return;
    }
    setTargetSets(plan.plannedSets);
    beginWork(1, plan.durationSec);
    return () => {
      clearTick();
      clearPrepTick();
      clearGoTimeout();
      clearAskIdle();
    };
  }, [open, plan?.exerciseName, plan?.plannedSets, plan?.durationSec, plan?.reps, beginWork]);

  // Smooth prep countdown + progress (synced)
  useEffect(() => {
    if (!open || phase !== "prep") {
      clearPrepTick();
      return;
    }

    clearPrepTick();
    prepTickRef.current = window.setInterval(() => {
      const elapsed = Date.now() - prepStartRef.current;
      const totalMs = PREP_SECONDS * 1000;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      const leftSec = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setPrepProgress(pct);
      setRemaining(leftSec);

      if (elapsed >= totalMs) {
        clearPrepTick();
        setPrepProgress(100);
        setRemaining(0);
        flashGoThenWork();
      }
    }, 50);

    return () => clearPrepTick();
  }, [open, phase, tickEpoch, flashGoThenWork]);

  // Work / rest 1s ticker — rest runs to 0, then asks breathe more / next set
  useEffect(() => {
    if (!open || (phase !== "work" && phase !== "rest")) {
      clearTick();
      return;
    }

    clearTick();
    tickRef.current = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(tickRef.current!);
          tickRef.current = null;
          window.setTimeout(() => onTimerComplete(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTick();
  }, [open, phase, tickEpoch, onTimerComplete]);

  // Auto-save if no response on ask screens
  useEffect(() => {
    if (!open || (phase !== "restAsk" && phase !== "done") || saving) {
      clearAskIdle();
      return;
    }

    clearAskIdle();
    setAskIdleLeft(ASK_IDLE_AUTO_SAVE_SEC);
    askIdleRef.current = window.setInterval(() => {
      setAskIdleLeft((prev) => {
        if (prev <= 1) {
          clearAskIdle();
          const setsDone = Math.max(1, currentSetRef.current);
          window.setTimeout(() => onFinishRef.current(setsDone), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearAskIdle();
  }, [open, phase, saving]);

  useEffect(() => {
    if (!open) return;
    const cycling =
      phase === "work" || phase === "rest" || phase === "restAsk";
    if (!cycling) return;

    setMotivationIndex(pickRandomIndex(WORK_MOTIVATIONS.length));
    setMotivationVisible(true);
    let fadeTimeout: number | undefined;

    const pushMode =
      (phase === "work" && remaining <= WORK_PUSH_AT) ||
      (phase === "rest" && remaining <= REST_PREP_AT);
    const intervalMs = pushMode ? 1600 : 3200;

    const id = window.setInterval(() => {
      setMotivationVisible(false);
      fadeTimeout = window.setTimeout(() => {
        setMotivationIndex((i) => {
          const p = phaseRef.current;
          const pool =
            p === "work"
              ? Math.max(WORK_MOTIVATIONS.length, WORK_PUSH_MOTIVATIONS.length)
              : Math.max(REST_MOTIVATIONS.length, REST_PREP_MOTIVATIONS.length);
          return pickRandomIndex(pool, i % pool);
        });
        setMotivationVisible(true);
      }, 220);
    }, intervalMs);

    return () => {
      window.clearInterval(id);
      if (fadeTimeout) window.clearTimeout(fadeTimeout);
    };
  }, [open, phase, tickEpoch, remaining <= WORK_PUSH_AT, remaining <= REST_PREP_AT]);

  const progressPct = useMemo(() => {
    if (phaseTotal <= 0) return 100;
    return Math.min(100, ((phaseTotal - remaining) / phaseTotal) * 100);
  }, [phaseTotal, remaining]);

  const nextSetLabel =
    currentSet >= targetSets ? "finish strong" : `set ${currentSet + 1}`;

  const workPushMode = phase === "work" && remaining > 0 && remaining <= WORK_PUSH_AT;
  const workHalfMode =
    phase === "work" && remaining > 0 && remaining <= phaseTotal / 2;
  const restPrepMode = phase === "rest" && remaining > 0 && remaining <= REST_PREP_AT;
  const clock = formatClock(remaining);

  const liveMotivation = useMemo(() => {
    if (phase === "work") {
      if (workPushMode) {
        return WORK_PUSH_MOTIVATIONS[
          motivationIndex % WORK_PUSH_MOTIVATIONS.length
        ];
      }
      return WORK_MOTIVATIONS[motivationIndex % WORK_MOTIVATIONS.length];
    }
    if (restPrepMode || (phase === "rest" && remaining <= REST_PREP_AT)) {
      const prep =
        REST_PREP_MOTIVATIONS[motivationIndex % REST_PREP_MOTIVATIONS.length];
      if (motivationIndex % 2 === 1) {
        return `Prepare for ${plan?.reps ?? ""} reps — ${nextSetLabel}.`;
      }
      return prep;
    }
    const base = REST_MOTIVATIONS[motivationIndex % REST_MOTIVATIONS.length];
    if (motivationIndex % 3 === 1) {
      return `Next up: ${plan?.reps ?? ""} reps — ${nextSetLabel}.`;
    }
    if (motivationIndex % 3 === 2) {
      return `Recover for ${nextSetLabel}. Stay sharp.`;
    }
    return base;
  }, [
    phase,
    workPushMode,
    restPrepMode,
    remaining,
    motivationIndex,
    nextSetLabel,
    plan?.reps,
  ]);

  if (!open || !plan) return null;

  const startNextSet = () => {
    clearAskIdle();
    beginWork(currentSet + 1, plan.durationSec);
  };

  const breatheMore = () => {
    clearAskIdle();
    beginRest();
  };

  const addExtraSet = () => {
    clearAskIdle();
    const next = currentSet + 1;
    setTargetSets(next);
    beginWork(next, plan.durationSec);
  };

  const finishNow = (sets: number) => {
    clearAskIdle();
    onFinish(sets);
  };

  const skipCountdown = () => {
    clearTick();
    clearPrepTick();
    clearGoTimeout();
    if (phase === "prep" || phase === "go") {
      startWorkTimer(currentSet, pendingWorkSecRef.current);
      return;
    }
    if (phase === "work") {
      setRemaining(0);
      onTimerComplete();
      return;
    }
    openRestAsk();
  };

  const showRestChrome = phase === "rest" || phase === "restAsk";
  const lastPlannedDone = currentSet >= targetSets;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-session-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Cancel session"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {guideOnly ? "Guided replay" : "Guided set"}
        </p>
        <h2
          id="exercise-session-title"
          className="mt-1 text-xl font-semibold tracking-tight"
        >
          {plan.exerciseName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {plan.reps} reps
          {plan.weight ? ` · weight ${plan.weight}` : ""}
          {" · "}
          set {Math.min(currentSet, targetSets)} of {targetSets}
          {currentSet > plan.plannedSets ? " (extra)" : ""}
        </p>

        {(phase === "prep" || phase === "go") && (
          <div className="mt-8 space-y-4 text-center">
            {phase === "prep" ? (
              <>
                <p className="text-sm font-medium text-muted-foreground">
                  Get ready — set {currentSet} starts in
                </p>
                <p
                  key={remaining}
                  className="font-mono text-7xl font-bold tabular-nums tracking-tight text-primary transition-transform duration-200"
                >
                  {remaining > 0 ? remaining : 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  Set your stance. {plan.reps} reps coming up.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Set {currentSet} — go time
                </p>
                <p
                  key={goText}
                  className="animate-pulse text-6xl font-extrabold tracking-tight text-primary"
                >
                  {goText}
                </p>
                <p className="text-sm text-muted-foreground">
                  Exercise starting…
                </p>
              </>
            )}

            <div className="relative mx-auto h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-primary/15">
              <div
                className={cn(
                  "h-full rounded-full bg-primary",
                  phase === "go" && "bg-primary",
                )}
                style={{
                  width: `${phase === "go" ? 100 : prepProgress}%`,
                  transition:
                    phase === "prep" ? "none" : "width 0.3s ease-out",
                }}
              />
            </div>

            {phase === "prep" ? (
              <Button type="button" variant="outline" size="sm" onClick={skipCountdown}>
                Start now
              </Button>
            ) : null}
          </div>
        )}

        {(phase === "work" || showRestChrome) && (
          <div className="mt-8 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm font-medium">
                {phase === "work" ? (
                  <>
                    <Dumbbell className="h-4 w-4 text-primary" />
                    Work — hit your reps
                  </>
                ) : (
                  <>
                    <Wind className="h-4 w-4 text-sky-500" />
                    Breathe — rest 2 min
                  </>
                )}
              </div>

              <div className="mx-auto w-full max-w-sm space-y-2">
                <p
                  key={`${phase}-${motivationIndex}-${workPushMode}-${restPrepMode}`}
                  className={cn(
                    "min-h-[2.5rem] text-center text-sm font-medium transition-all duration-300",
                    phase === "work"
                      ? workPushMode
                        ? "text-primary"
                        : workHalfMode
                          ? "text-yellow-400"
                          : "text-foreground/80"
                      : restPrepMode
                        ? "text-sky-300"
                        : "text-sky-400",
                    motivationVisible
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1 opacity-0",
                  )}
                >
                  {liveMotivation}
                </p>
                {workPushMode ? (
                  <div className="flex justify-center gap-1.5 pt-0.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <span
                        key={i}
                        className="inline-block h-2 w-2 rounded-full bg-primary"
                        style={{
                          animation: "forge-blip 0.85s ease-in-out infinite",
                          animationDelay: `${i * 100}ms`,
                        }}
                        aria-hidden
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <p
              className={cn(
                "text-center font-mono text-5xl font-semibold tabular-nums tracking-tight transition-colors",
                showRestChrome && "text-sky-500",
                restPrepMode && "text-sky-300",
                phase === "work" && workHalfMode && !workPushMode && "text-yellow-400",
                phase === "work" && workPushMode && "text-primary",
                phase === "work" && !workHalfMode && !workPushMode && "text-foreground",
              )}
            >
              {showRestChrome ? (
                <>
                  <span>{clock.minutes}</span>
                  <span>:</span>
                  <span
                    className="inline-block origin-center"
                    style={
                      restPrepMode
                        ? {
                            animation: "forge-sec-beat 0.35s ease-in-out infinite",
                          }
                        : undefined
                    }
                  >
                    {clock.seconds}
                  </span>
                </>
              ) : (
                <>
                  <span>{clock.minutes}</span>
                  <span>:</span>
                  <span
                    className={cn(
                      "inline-block",
                      workPushMode && "origin-center",
                    )}
                    style={
                      workPushMode
                        ? {
                            animation: "forge-sec-beat 0.35s ease-in-out infinite",
                          }
                        : undefined
                    }
                  >
                    {clock.seconds}
                  </span>
                </>
              )}
            </p>

            <div
              className={cn(
                "relative h-3 w-full overflow-hidden rounded-full",
                showRestChrome ? "bg-sky-500/15" : "bg-secondary",
              )}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-1000 ease-linear",
                  showRestChrome ? "bg-sky-500" : "bg-primary",
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {phase === "restAsk" ? (
              <div className="space-y-3 pt-1 text-center">
                <p className="text-sm font-medium">
                  {lastPlannedDone
                    ? "Rest done — breathe more, extra set, or finish?"
                    : `Rest done — breathe more or start set ${currentSet + 1}?`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {guideOnly
                    ? <>No response → closes in{" "}
                      <span className="font-mono tabular-nums text-foreground">
                        {askIdleLeft}s
                      </span></>
                    : <>No response → auto-saves in{" "}
                      <span className="font-mono tabular-nums text-foreground">
                        {askIdleLeft}s
                      </span>{" "}
                      ({currentSet} set{currentSet === 1 ? "" : "s"} · {plan.reps}{" "}
                      reps
                      {plan.weight ? ` · weight ${plan.weight}` : ""})</>}
                </p>
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" onClick={breatheMore}>
                    <Wind className="mr-2 h-4 w-4" />
                    Breathe +2 min
                  </Button>
                  {lastPlannedDone ? (
                    <>
                      <Button type="button" variant="outline" onClick={addExtraSet}>
                        One extra set
                      </Button>
                      <Button
                        type="button"
                        onClick={() => finishNow(targetSets)}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Finish &amp; {guideOnly ? "close" : "save"}
                      </Button>
                    </>
                  ) : (
                    <Button type="button" onClick={startNextSet}>
                      Start set {currentSet + 1}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-center gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={skipCountdown}>
                  {phase === "work" ? "Done with this set" : "Skip rest"}
                </Button>
              </div>
            )}
          </div>
        )}

        {phase === "done" && (
          <div className="mt-8 space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="text-base font-medium">
              {targetSets} set{targetSets === 1 ? "" : "s"} complete
            </p>
            <p className="text-sm text-muted-foreground">
              Extra rest, one more set, or finish and log this exercise?
            </p>
            <p className="text-xs text-muted-foreground">
              {guideOnly ? "Closes" : "Auto-saves"} in{" "}
              <span className="font-mono tabular-nums text-foreground">
                {askIdleLeft}s
              </span>{" "}
              if you don’t choose
            </p>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={breatheMore}
                disabled={saving}
              >
                <Wind className="mr-2 h-4 w-4" />
                Breathe +2 min
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={addExtraSet}
                disabled={saving}
              >
                One extra set
              </Button>
              <Button
                type="button"
                onClick={() => finishNow(targetSets)}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Finish &amp; {guideOnly ? "close" : "save"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
