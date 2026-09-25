"use client";

import { useLayoutEffect, useRef } from "react";

/** After the fade finishes, remounts keep the final state (no second flash). */
let splashLogoStarted = false;
let splashLogoPlayed = false;

/**
 * Mid-splash FORGE logo — original fade-up (0.45s delay, 1.1s duration).
 * Replays once when the instant bg cover is removed so the fade is visible.
 */
export function SplashLogo() {
  const ref = useRef<HTMLImageElement>(null);

  useLayoutEffect(() => {
    document.getElementById("forge-instant-splash")?.remove();
    const el = ref.current;
    if (!el) return;

    if (splashLogoPlayed) {
      el.classList.add("forge-splash-logo--done");
      return;
    }

    if (splashLogoStarted) return;
    splashLogoStarted = true;

    // Restart the CSS fade so it plays on screen (not under the early cover).
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
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
      onAnimationEnd={(e) => {
        if (e.target !== ref.current) return;
        splashLogoPlayed = true;
        ref.current?.classList.add("forge-splash-logo--done");
      }}
    />
  );
}
