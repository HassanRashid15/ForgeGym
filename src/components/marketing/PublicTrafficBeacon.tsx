"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const SKIP_PREFIXES = [
  "/api",
  "/dashboard",
  "/login",
  "/register",
  "/verification",
  "/verify",
  "/profile",
  "/unsubscribe",
];

function shouldTrack(path: string) {
  if (!path || path.startsWith("/_next")) return false;
  return !SKIP_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

/**
 * Records public page approaches once per path per browser session.
 */
export function PublicTrafficBeacon() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || !shouldTrack(pathname)) return;
    if (lastSent.current === pathname) return;

    try {
      const key = `forge_traffic:${pathname}`;
      if (sessionStorage.getItem(key)) {
        lastSent.current = pathname;
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      // private mode — still send once per mount path
    }

    lastSent.current = pathname;

    const body = JSON.stringify({
      path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    });

    void fetch("/api/traffic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
