"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  doneTopProgress,
  startTopProgress,
  subscribeTopProgress,
  type TopProgressSnapshot,
} from "@/lib/top-progress";

const BRAND = "#FA1818";

function isModifiedClick(e: MouseEvent) {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

function shouldTrackHref(href: string | null, currentUrl: URL): boolean {
  if (!href || href.startsWith("#")) return false;
  if (
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("javascript:")
  ) {
    return false;
  }

  let next: URL;
  try {
    next = new URL(href, currentUrl.origin);
  } catch {
    return false;
  }

  if (next.origin !== currentUrl.origin) return false;
  // Same path + query → no navigation progress
  if (
    next.pathname === currentUrl.pathname &&
    next.search === currentUrl.search
  ) {
    return false;
  }
  return true;
}

/**
 * Full-width brand progress line at the top of the viewport.
 * Starts on internal link clicks / history nav; completes on route change.
 * Also driven by startTopProgress/doneTopProgress (e.g. Save Changes).
 * Does not replace the home preloader / splash.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [snap, setSnap] = useState<TopProgressSnapshot>({
    active: false,
    value: 0,
  });

  useEffect(() => subscribeTopProgress(setSnap), []);

  // Complete when the App Router finishes the transition
  useEffect(() => {
    doneTopProgress();
  }, [pathname, searchParams]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (isModifiedClick(e)) return;
      const el = e.target as Element | null;
      const a = el?.closest?.("a");
      if (!a || a.hasAttribute("download")) return;
      if (a.getAttribute("target") === "_blank") return;
      const href = a.getAttribute("href");
      if (!shouldTrackHref(href, new URL(window.location.href))) return;
      startTopProgress();
    };

    const onPopState = () => startTopProgress();

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  if (!snap.active && snap.value === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(snap.value)}
      aria-hidden={!snap.active}
    >
      <div className="relative h-[2.5px] w-full overflow-hidden bg-transparent">
        <div
          className="forge-top-progress h-full origin-left"
          style={{
            width: `${snap.value}%`,
            background: BRAND,
            boxShadow: `0 0 8px ${BRAND}, 0 0 16px rgba(250, 24, 24, 0.75)`,
            opacity: snap.active || snap.value > 0 ? 1 : 0,
            transition:
              snap.value >= 100
                ? "width 160ms ease-out, opacity 200ms ease"
                : "width 180ms linear",
          }}
        />
      </div>
    </div>
  );
}
