"use client";

import { useEffect, useRef, useState } from "react";
import { SplashScreen } from "@/components/marketing/SplashScreen";
import {
  SPLASH_SEEN_COOKIE,
  splashSeenCookieScript,
} from "@/lib/splash-cookie";

const HOLD_MS = 10_000;
const FADE_MS = 500;

type PreloaderProps = {
  onComplete?: () => void;
  /**
   * When true (default), skip if cookie already set; record IP via /api/splash-visit
   * so the home splash only plays once per visitor.
   */
  oncePerVisitor?: boolean;
};

function hasSeenCookie() {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${SPLASH_SEEN_COOKIE}=1`));
}

function markSeenCookie() {
  document.cookie = splashSeenCookieScript();
}

/**
 * Client preloader (10s). Prefer SSR SplashScreen on the home page for instant paint.
 * Runs once per visitor (cookie + IP stored in DB via /api/splash-visit).
 */
export default function Preloader({
  onComplete,
  oncePerVisitor = true,
}: PreloaderProps) {
  const [phase, setPhase] = useState<"pending" | "show" | "fade" | "skip">(
    () => (oncePerVisitor && hasSeenCookie() ? "skip" : "pending"),
  );
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (phase === "skip") {
      onCompleteRef.current?.();
      return;
    }
    if (phase !== "pending") return;

    let cancelled = false;
    let fadeTimer = 0;
    let doneTimer = 0;

    const play = () => {
      markSeenCookie();
      setPhase("show");
      fadeTimer = window.setTimeout(() => {
        if (!cancelled) setPhase("fade");
      }, HOLD_MS);
      doneTimer = window.setTimeout(() => {
        if (!cancelled) onCompleteRef.current?.();
      }, HOLD_MS + FADE_MS);
    };

    const init = async () => {
      if (oncePerVisitor) {
        try {
          const res = await fetch("/api/splash-visit", { method: "POST" });
          const data = (await res.json().catch(() => null)) as {
            isFirstVisit?: boolean;
          } | null;
          if (cancelled) return;
          if (data?.isFirstVisit === false) {
            markSeenCookie();
            setPhase("skip");
            onCompleteRef.current?.();
            return;
          }
        } catch {
          // Fail open — show splash
        }
      }
      if (!cancelled) play();
    };

    void init();

    return () => {
      cancelled = true;
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  if (phase === "skip" || phase === "pending") return null;

  return <SplashScreen fading={phase === "fade"} />;
}
