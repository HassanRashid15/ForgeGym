"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

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
  document.documentElement.style.overflowY = "";
  document.body.style.overflowY = "";
}

/**
 * Non-home routes: unlock scroll immediately.
 * Home splash is owned by the SSR HomePage + HomeBootSplash (10s).
 */
export function SplashProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [splashReady, setSplashReady] = useState(!isHome);

  useEffect(() => {
    if (isHome) {
      // Home page owns the 10s SSR preloader
      setSplashReady(false);
      return;
    }
    unlockSplashScroll();
    setSplashReady(true);
  }, [isHome]);

  // When home finishes splash, HomeBootSplash unlocks — mark ready for consumers
  useEffect(() => {
    if (!isHome) return;

    const check = () => {
      if (!document.getElementById("forge-ssr-splash")) {
        setSplashReady(true);
      }
    };

    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    const poll = window.setInterval(check, 250);
    return () => {
      observer.disconnect();
      window.clearInterval(poll);
    };
  }, [isHome]);

  const value = useMemo(() => ({ splashReady }), [splashReady]);

  return (
    <SplashContext.Provider value={value}>{children}</SplashContext.Provider>
  );
}
