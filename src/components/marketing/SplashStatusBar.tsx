"use client";

import { useEffect, useState } from "react";

const STATUS_LINES = [
  "INITIALIZING SYSTEM PROTOCOLS",
  "CALIBRATING POWER SYSTEMS",
  "LOADING TRAINING MODULES",
] as const;

/** Matches `.forge-splash-bottom` fade-up delay in globals.css */
const BOTTOM_REVEAL_MS = 4800;
/** Progress fill duration */
const PROGRESS_MS = 2800;
/** Hold full bar briefly, then welcome animates in */
const WELCOME_AFTER_FULL_MS = 280;

/**
 * Status copy advances with the neon progress line.
 * After 100%, bar exits and “LET’S GET STARTED” animates in.
 */
export function SplashStatusBar() {
  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "full" | "welcome">("loading");

  useEffect(() => {
    const start = window.setTimeout(() => setStarted(true), BOTTOM_REVEAL_MS);
    return () => window.clearTimeout(start);
  }, []);

  useEffect(() => {
    if (!started) return;

    let raf = 0;
    let welcomeTimer = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / PROGRESS_MS);
      const eased =
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setProgress(eased * 100);

      if (t < 1) {
        raf = window.requestAnimationFrame(tick);
      } else {
        setProgress(100);
        setPhase("full");
        welcomeTimer = window.setTimeout(() => {
          setPhase("welcome");
        }, WELCOME_AFTER_FULL_MS);
      }
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(welcomeTimer);
    };
  }, [started]);

  const lineIndex = Math.min(
    STATUS_LINES.length - 1,
    Math.floor((Math.min(progress, 99.9) / 100) * STATUS_LINES.length),
  );
  const isWelcome = phase === "welcome";
  const showBar = phase === "loading" || phase === "full";

  return (
    <div className="forge-splash-bottom flex w-full max-w-[min(72vw,280px)] flex-col items-center">
      {isWelcome ? (
        <p
          className="forge-splash-welcome forge-splash-status mb-3 text-center text-[18px] font-semibold uppercase tracking-wide text-white sm:text-[20px]"
          aria-live="polite"
        >
          LET&apos;S GET <span className="font-bold text-[#FA1818]">STARTED</span>
        </p>
      ) : (
        <p
          key={STATUS_LINES[lineIndex]}
          className="forge-splash-status mb-3 min-h-[1.25rem] text-center text-[10px] font-semibold uppercase tracking-wide text-[#FA1818] sm:text-[11px]"
          aria-live="polite"
        >
          {STATUS_LINES[lineIndex]}
        </p>
      )}

      {showBar && (
        <div
          className={`forge-splash-track relative h-px w-full bg-[#FA1818]/20 transition-opacity duration-300 ${
            phase === "full" ? "opacity-0" : "opacity-100"
          }`}
        >
          <div
            className="forge-splash-progress relative h-full bg-[#FA1818]"
            style={{ width: `${progress}%` }}
          >
            <span className="forge-splash-progress-tip" aria-hidden />
          </div>
        </div>
      )}
    </div>
  );
}
