"use client";

import { useEffect, useState } from "react";

const STATUS_LINES = [
  "INITIALIZING SYSTEM PROTOCOLS",
  "CALIBRATING POWER SYSTEMS",
  "LOADING TRAINING MODULES",
  "WELCOME",
] as const;

const BOTTOM_REVEAL_MS = 4800;
const ROTATE_MS = 1200;

/**
 * Dynamic status + neon progress line.
 * Last line is WELCOME, then the boot splash fades into home.
 */
export function SplashStatusBar() {
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const start = window.setTimeout(() => setStarted(true), BOTTOM_REVEAL_MS);
    return () => window.clearTimeout(start);
  }, []);

  useEffect(() => {
    if (!started) return;
    const id = window.setInterval(() => {
      setIndex((i) => {
        if (i >= STATUS_LINES.length - 1) {
          window.clearInterval(id);
          return i;
        }
        return i + 1;
      });
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [started]);

  const isWelcome = STATUS_LINES[index] === "WELCOME";

  return (
    <div className="forge-splash-bottom flex w-full max-w-[min(72vw,280px)] flex-col items-center">
      <p
        className={`forge-splash-status mb-3 min-h-[1.25rem] text-center text-[10px] font-semibold uppercase tracking-wide sm:text-[11px] transition-all duration-700 ease-out ${
          isWelcome 
            ? "text-white translate-y-8" 
            : "text-[#FA1818] translate-y-0"
        }`}
        aria-live="polite"
      >
        {STATUS_LINES[index]}
      </p>

      {!isWelcome && (
        <div className="forge-splash-track relative h-px w-full bg-[#FA1818]/20">
          <div
            className="forge-splash-progress relative h-full bg-[#FA1818]"
            style={{ width: 0 }}
          >
            <span className="forge-splash-progress-tip" aria-hidden />
          </div>
        </div>
      )}
    </div>
  );
}
