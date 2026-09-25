"use client";

import { useEffect } from "react";
import { splashSeenCookieScript } from "@/lib/splash-cookie";

/** Sets forge_splash_seen so return visits skip the instant black flash. */
export function MarkSplashSeen() {
  useEffect(() => {
    document.cookie = splashSeenCookieScript();
  }, []);
  return null;
}
