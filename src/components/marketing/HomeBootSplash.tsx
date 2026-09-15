"use client";

import {
  Children,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const HOLD_MS = 9_600;
const FADE_MS = 600;
const SPLASH_LOCK = "forge-splash-lock";

function unlockSplashScroll() {
  document.documentElement.classList.remove(SPLASH_LOCK);
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.right = "";
  document.body.style.bottom = "";
  document.body.style.left = "";
  document.body.style.inset = "";
  document.body.style.width = "";
  document.body.style.height = "";
  document.documentElement.style.overflow = "";
  document.documentElement.style.overflowY = "";
  document.body.style.overflowY = "";
}

function lockSplashScroll() {
  document.documentElement.classList.add(SPLASH_LOCK);
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.inset = "0";
  document.body.style.width = "100%";
  document.body.style.height = "100%";
}

type HomeBootSplashProps = {
  /** First child: SSR SplashScreen. Second: home content. */
  children: ReactNode;
};

/**
 * Keeps the SSR preloader visible for 10s, then fades and reveals home content.
 * Logo fade-in delay matches mobile CustomSplashScreen.
 */
export function HomeBootSplash({ children }: HomeBootSplashProps) {
  const [phase, setPhase] = useState<"show" | "fade" | "done">("show");
  const items = Children.toArray(children);
  const splash = items[0];
  const content = items.slice(1);
  const blockRef = useRef<((e: Event) => void) | null>(null);

  const releaseScrollBlock = useCallback(() => {
    if (blockRef.current) {
      window.removeEventListener("wheel", blockRef.current);
      window.removeEventListener("touchmove", blockRef.current);
      blockRef.current = null;
    }
    unlockSplashScroll();
  }, []);

  useLayoutEffect(() => {
    lockSplashScroll();
    document.getElementById("forge-instant-splash")?.remove();

    // Restart logo fade-in so the 450ms delay is visible
    const logo = document.querySelector<HTMLElement>(".forge-splash-logo");
    if (logo) {
      logo.style.animation = "none";
      void logo.offsetWidth;
      logo.style.animation = "";
    }

    const block = (e: Event) => e.preventDefault();
    blockRef.current = block;
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });

    return () => {
      releaseScrollBlock();
    };
  }, [releaseScrollBlock]);

  const finish = useCallback(() => {
    releaseScrollBlock();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.getElementById("forge-instant-splash")?.remove();
    document.getElementById("forge-ssr-splash")?.remove();
    setPhase("done");
  }, [releaseScrollBlock]);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setPhase("fade"), HOLD_MS);
    const doneTimer = window.setTimeout(finish, HOLD_MS + FADE_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [finish]);

  const showSplash = phase !== "done";

  return (
    <>
      {showSplash && (
        <div className={phase === "fade" ? "pointer-events-none" : undefined}>
          <SplashFadeBridge fading={phase === "fade"}>{splash}</SplashFadeBridge>
        </div>
      )}
      <div
        className={showSplash ? "pointer-events-none select-none" : undefined}
        aria-hidden={showSplash}
        style={
          showSplash
            ? {
                visibility: "hidden",
                height: 0,
                overflow: "hidden",
                position: "absolute",
                width: "100%",
                pointerEvents: "none",
              }
            : undefined
        }
      >
        {content}
      </div>
    </>
  );
}

function SplashFadeBridge({
  children,
  fading,
}: {
  children: ReactNode;
  fading: boolean;
}) {
  useEffect(() => {
    const el = document.getElementById("forge-ssr-splash");
    const instant = document.getElementById("forge-instant-splash");
    if (fading) {
      el?.classList.add("opacity-0", "pointer-events-none");
      el?.setAttribute("aria-hidden", "true");
      if (instant) {
        instant.style.transition = "opacity 500ms ease-out";
        instant.style.opacity = "0";
      }
    } else {
      el?.classList.remove("opacity-0", "pointer-events-none");
      el?.setAttribute("aria-hidden", "false");
    }
  }, [fading]);

  return <>{children}</>;
}
