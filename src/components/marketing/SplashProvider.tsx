"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import Preloader from "@/components/marketing/Preloader";

const SPLASH_LOCK = "forge-splash-lock";

type SplashContextValue = {
  /** False while the boot splash is covering the viewport. */
  splashReady: boolean;
};

const SplashContext = createContext<SplashContextValue>({ splashReady: true });

export function useSplash() {
  return useContext(SplashContext);
}

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
}

/**
 * Home-only splash: locks scroll (no scrollbar) while the preloader is up,
 * then reveals SSR home content at scroll top.
 */
export function SplashProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [splashReady, setSplashReady] = useState(() => {
    if (typeof window === "undefined") return !isHome;
    // Match early head script: home starts locked until preloader completes
    return pathname !== "/";
  });

  // Soft-nav away from home → unlock; returning to `/` mid-session skips splash
  useEffect(() => {
    if (!isHome) {
      unlockSplashScroll();
      setSplashReady(true);
    }
  }, [isHome]);

  useLayoutEffect(() => {
    if (!isHome || splashReady) return;

    document.documentElement.classList.add(SPLASH_LOCK);
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.inset = "0";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    const block = (e: Event) => {
      e.preventDefault();
    };
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });

    return () => {
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
    };
  }, [isHome, splashReady]);

  const complete = useCallback(() => {
    unlockSplashScroll();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setSplashReady(true);
  }, []);

  const value = useMemo(() => ({ splashReady }), [splashReady]);
  const showSplash = isHome && !splashReady;

  return (
    <SplashContext.Provider value={value}>
      {showSplash && <Preloader onComplete={complete} />}
      <div
        className={showSplash ? "pointer-events-none select-none" : undefined}
        aria-hidden={showSplash}
        // Collapse layout height so the document can't grow a scrollbar under the splash
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
        {children}
      </div>
    </SplashContext.Provider>
  );
}
