"use client";

import { useEffect, useState } from "react";
import { SplashScreen } from "@/components/marketing/SplashScreen";

const HOLD_MS = 10_000;
const FADE_MS = 500;

type PreloaderProps = {
  onComplete?: () => void;
};

/**
 * Client preloader (10s). Prefer SSR SplashScreen on the home page for instant paint.
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

  return <SplashScreen fading={phase === "fade"} />;
}
