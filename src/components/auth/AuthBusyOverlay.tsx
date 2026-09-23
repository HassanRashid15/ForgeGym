"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type AuthBusyMode =
  | "login"
  | "register"
  | "register-admin"
  | "logout";

const TITLES: Record<AuthBusyMode, string> = {
  login: "Signing you in…",
  register: "Welcome to Forge",
  "register-admin": "Building your gym profile…",
  logout: "Signing you out…",
};

const TIPS: Record<AuthBusyMode, readonly string[]> = {
  login: [
    "Checking your credentials…",
    "Warming up your session…",
    "Loading your training hub…",
    "Almost there — lace up…",
  ],
  register: [
    "Creating your account…",
    "Setting up your profile…",
    "Linking your gym…",
    "Preparing your dashboard…",
  ],
  "register-admin": [
    "Creating your gym owner account…",
    "Uploading gym media…",
    "Setting up your facility…",
    "Notifying super admins…",
  ],
  logout: [
    "Saving your progress…",
    "Clearing your session…",
    "Locking the locker room…",
    "See you on the floor…",
  ],
};

const ROTATE_MS = 1600;

type AuthBusyOverlayProps = {
  busy: boolean;
  mode?: AuthBusyMode;
  /** After login sync — personalized welcome */
  welcomeName?: string | null;
  /** After logout — personalized goodbye */
  farewellName?: string | null;
};

function firstName(full: string) {
  const part = full.trim().split(/\s+/)[0];
  return part || "Athlete";
}

/**
 * Full-screen auth busy state — Forge brand mark, pulsing ring, rotating tips.
 * Login end: Welcome, {name}. Logout end: See you, {name}.
 */
export function AuthBusyOverlay({
  busy,
  mode = "login",
  welcomeName = null,
  farewellName = null,
}: AuthBusyOverlayProps) {
  const [mounted, setMounted] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const tips = TIPS[mode];
  const isWelcome = Boolean(welcomeName?.trim());
  const isFarewell = Boolean(farewellName?.trim());
  const isHero = isWelcome || isFarewell;

  const title = isWelcome
    ? `Welcome, ${firstName(welcomeName!)}`
    : isFarewell
      ? `See you, ${firstName(farewellName!)}`
      : TITLES[mode];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!busy || isHero) {
      setTipIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [busy, isHero, tips.length]);

  useEffect(() => {
    if (!busy) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [busy]);

  if (!mounted || !busy) return null;

  return createPortal(
    <div
      className="forge-auth-busy fixed inset-0 z-[10000] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy={!isHero}
      aria-label={title}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div className="relative z-10 flex max-w-[min(92vw,420px)] flex-col items-center px-6 text-center">
        <div
          className={`forge-auth-busy-mark relative mb-10 flex h-36 w-36 items-center justify-center sm:h-40 sm:w-40 ${
            isHero ? "forge-auth-busy-mark--welcome" : ""
          }`}
        >
          {!isHero && <span className="forge-auth-busy-ring" aria-hidden />}
          <span className="forge-auth-busy-pulse" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/preloader_logo.png"
            alt="FORGE"
            className="relative z-10 h-24 w-24 object-contain drop-shadow-[0_0_28px_rgba(250,24,24,0.5)] sm:h-28 sm:w-28"
            draggable={false}
          />
        </div>

        <p
          key={title}
          className={`font-display tracking-wide text-white ${
            isHero
              ? "forge-auth-busy-welcome-title text-3xl sm:text-4xl"
              : "text-2xl sm:text-3xl"
          }`}
        >
          {isWelcome ? (
            <>
              Welcome,{" "}
              <span className="text-[#FA1818]">{firstName(welcomeName!)}</span>
            </>
          ) : isFarewell ? (
            <>
              See you,{" "}
              <span className="text-[#FA1818]">{firstName(farewellName!)}</span>
            </>
          ) : (
            title
          )}
        </p>

        {isWelcome ? (
          <p className="forge-auth-busy-tip mt-4 text-base text-zinc-400 sm:text-lg">
            {mode === "login"
              ? "Taking you to your dashboard…"
              : mode === "register-admin"
                ? "Next: verify email, then await approval…"
                : "Next: verify your email to continue…"}
          </p>
        ) : isFarewell ? (
          <p className="forge-auth-busy-tip mt-4 text-base text-zinc-400 sm:text-lg">
            Come back stronger…
          </p>
        ) : (
          <p
            key={tips[tipIndex]}
            className="forge-auth-busy-tip mt-4 min-h-[1.5rem] text-base text-[#FA1818]/90 sm:text-lg"
          >
            {tips[tipIndex]}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
