"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface StepperProps {
  steps: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
  currentStep: number;
  completedSteps?: number[];
  className?: string;
  /** Jump to a step (usually completed / current). Same pattern as register editing. */
  onStepClick?: (stepNumber: number) => void;
}

const TIP = 10;

function chevronClip(isFirst: boolean, isLast: boolean) {
  if (isFirst && isLast) {
    return "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
  }
  if (isFirst) {
    return `polygon(0 0, calc(100% - ${TIP}px) 0, 100% 50%, calc(100% - ${TIP}px) 100%, 0 100%)`;
  }
  if (isLast) {
    return `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${TIP}px 50%)`;
  }
  return `polygon(0 0, calc(100% - ${TIP}px) 0, 100% 50%, calc(100% - ${TIP}px) 100%, 0 100%, ${TIP}px 50%)`;
}

/**
 * Chevron stepper — scrollable without visible scrollbar; click completed steps to edit.
 */
const Stepper = ({
  steps,
  currentStep,
  completedSteps = [],
  className,
  onStepClick,
}: StepperProps) => {
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const safeStep = Math.min(Math.max(currentStep, 1), Math.max(steps.length, 1));
  const pct =
    currentStep > steps.length
      ? 100
      : Math.max(0, Math.round(((safeStep - 1) / (steps.length - 1 || 1)) * 100));

  React.useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLElement>('[aria-current="step"]');
    active?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [currentStep]);

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={scrollerRef}
        className={cn(
          "w-full overflow-x-auto overscroll-x-contain",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        <ol className="flex h-12 w-max min-w-full list-none items-stretch p-0">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isFirst = index === 0;
            const isLast = index === steps.length - 1;
            const isActive = stepNumber === currentStep;
            const isCompleted =
              completedSteps.includes(stepNumber) || stepNumber < currentStep;
            const isNext = stepNumber === currentStep + 1;
            const canJump =
              !!onStepClick && (stepNumber <= currentStep || isCompleted);
            const clip = chevronClip(isFirst, isLast);

            return (
              <li
                key={step.id}
                className={cn(
                  "relative flex h-12 w-[8.75rem] shrink-0 flex-col justify-center sm:w-[9.5rem]",
                  !isFirst && "-ml-2",
                )}
                style={{ zIndex: isActive ? 30 : isCompleted ? 20 : 10 + index }}
                aria-current={isActive ? "step" : undefined}
              >
                <button
                  type="button"
                  disabled={!canJump}
                  onClick={() => canJump && onStepClick?.(stepNumber)}
                  title={`${step.title}${step.description ? ` — ${step.description}` : ""}`}
                  className={cn(
                    "flex h-full w-full flex-col justify-center text-left transition-opacity",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && !isActive && "bg-primary/20 text-foreground",
                    !isActive &&
                      !isCompleted &&
                      "border border-border bg-card text-foreground",
                    canJump && "cursor-pointer hover:brightness-110",
                    !canJump && "cursor-default",
                  )}
                  style={{
                    clipPath: clip,
                    WebkitClipPath: clip,
                    paddingLeft: isFirst ? 10 : TIP + 8,
                    paddingRight: isLast ? 10 : TIP + 8,
                  }}
                >
                  <span
                    className={cn(
                      "block truncate text-[11px] font-semibold leading-tight sm:text-xs",
                      isActive && "text-primary-foreground",
                      isNext && !isActive && "text-primary",
                    )}
                  >
                    {step.title}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block truncate text-[9px] leading-tight sm:text-[10px]",
                      isActive
                        ? "text-primary-foreground/85"
                        : "text-muted-foreground",
                    )}
                  >
                    {step.description || `Step ${stepNumber}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-2 flex justify-end">
        <span className="text-xs font-semibold tabular-nums text-primary">{pct}%</span>
      </div>
    </div>
  );
};

export { Stepper, type StepperProps };
