"use client";

import { useLayoutEffect, useRef } from "react";

/** Survives Strict Mode / hydrate remounts — fade runs once per page load. */
let splashLogoStarted = false;
let splashLogoPlayed = false;

/**
 * Mid-splash FORGE logo.
 * Starts the fade only once in layout (after instant bg cover is gone) so
 * SSR → hydrate never flashes the logo twice.
 */
export function SplashLogo() {
  const ref = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reveal SSR splash under the early bg cover, then animate once.
    document.getElementById("forge-instant-splash")?.remove();

    if (splashLogoPlayed) {
      el.classList.add("forge-splash-logo--done");
      el.classList.remove("forge-splash-logo--animate");
      return;
    }

    if (splashLogoStarted) {
      // Remount mid-play — freeze final state instead of restarting.
      splashLogoPlayed = true;
      el.classList.add("forge-splash-logo--done");
      el.classList.remove("forge-splash-logo--animate");
      return;
    }

    splashLogoStarted = true;
    void el.offsetWidth;
    el.classList.add("forge-splash-logo--animate");
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src="/preloader_logo.png"
      alt="FORGE — Train. Build. Become."
      className="forge-splash-logo w-[min(72vw,320px)] object-contain drop-shadow-[0_0_40px_rgba(250,24,24,0.35)]"
      draggable={false}
      decoding="async"
      loading="eager"
      fetchPriority="high"
      onAnimationEnd={() => {
        splashLogoPlayed = true;
        const el = ref.current;
        if (!el) return;
        el.classList.add("forge-splash-logo--done");
        el.classList.remove("forge-splash-logo--animate");
      }}
    />
  );
}
