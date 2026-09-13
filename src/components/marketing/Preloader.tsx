"use client";

import { useEffect, useState } from "react";

const HOLD_MS = 2500;
const FADE_MS = 500;

type PreloaderProps = {
  onComplete?: () => void;
};

/**
 * Simple splash: background + centered logo.
 * Calls onComplete after hold + fade so the SSR home page can reveal at scroll top.
 */
export default function Preloader({ onComplete }: PreloaderProps) {
  const [phase, setPhase] = useState<"show" | "fade">("show");

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fade"), HOLD_MS);
    const doneTimer = setTimeout(() => {
      onComplete?.();
    }, HOLD_MS + FADE_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex h-dvh w-screen max-w-[100vw] items-center justify-center overflow-hidden overscroll-none bg-black transition-opacity ease-out ${
        phase === "fade" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      role="status"
      aria-label="Loading Forge Gym"
      aria-hidden={phase === "fade"}
    >
      <img
        src="/gymauth.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "50% 20%" }}
        draggable={false}
        fetchPriority="high"
      />
      <div className="absolute inset-0 bg-black/40" />

      <img
        src="/forge.png"
        alt="FORGE"
        className="relative z-10 w-[min(72vw,320px)] object-contain drop-shadow-[0_0_40px_rgba(250,24,24,0.35)]"
        draggable={false}
        fetchPriority="high"
      />
    </div>
  );
}
