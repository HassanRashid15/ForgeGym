/**
 * SSR splash — centered FORGE logo + TRAIN/FUEL/CONQUER under logo,
 * neon progress line at the bottom.
 */

import { SplashStatusBar } from "@/components/marketing/SplashStatusBar";

const RED = "#FA1818";

function DumbbellIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="1" y="8" width="3" height="8" rx="1" fill={RED} />
      <rect x="4" y="6" width="3" height="12" rx="1" fill={RED} />
      <rect x="7" y="10.5" width="10" height="3" rx="1" fill={RED} />
      <rect x="17" y="6" width="3" height="12" rx="1" fill={RED} />
      <rect x="20" y="8" width="3" height="8" rx="1" fill={RED} />
    </svg>
  );
}

function HeartPulseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={RED}
      />
      <polyline
        points="4 12 8 12 10 9 13 15 15 12 20 12"
        stroke="#0D0D0D"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" fill={RED} />
      <path d="M6 4H3v2a3 3 0 0 0 3 3V4z" fill={RED} />
      <path d="M18 4h3v2a3 3 0 0 1-3 3V4z" fill={RED} />
      <rect x="10" y="13" width="4" height="3" fill={RED} />
      <rect x="7" y="16" width="10" height="2.5" rx="1" fill={RED} />
      <line x1="12" y1="9" x2="12" y2="13" stroke="#0D0D0D" strokeWidth="1.5" />
    </svg>
  );
}

const PILLARS = [
  { label: "TRAIN.", Icon: DumbbellIcon, className: "forge-splash-pillar forge-splash-pillar-1" },
  { label: "FUEL.", Icon: HeartPulseIcon, className: "forge-splash-pillar forge-splash-pillar-2" },
  { label: "CONQUER.", Icon: TrophyIcon, className: "forge-splash-pillar forge-splash-pillar-3" },
] as const;

export function SplashScreen({
  fading = false,
}: {
  fading?: boolean;
}) {
  return (
    <div
      id="forge-ssr-splash"
      className={`fixed inset-0 z-[9999] flex h-dvh w-screen max-w-[100vw] flex-col items-center justify-center overflow-hidden overscroll-none bg-[#0D0D0D] transition-opacity duration-500 ease-out ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-label="Loading Forge Gym"
      aria-hidden={fading}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/splash_img.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover brightness-[1.25] contrast-[1.05] sm:brightness-100 sm:contrast-100"
        style={{ objectPosition: "50% 28%" }}
        draggable={false}
        decoding="async"
        loading="eager"
        fetchPriority="high"
      />
      {/* Mobile: no full wash — soft bottom fade for status text only.
          Desktop: light overlay for contrast. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent sm:hidden" />
      <div className="absolute inset-0 hidden bg-black/30 sm:block" />

      {/* Center stack: logo + pillars directly under it */}
      <div className="relative z-10 flex flex-col items-center px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/preloader_logo.png"
          alt="FORGE — Train. Build. Become."
          className="forge-splash-logo w-[min(72vw,320px)] object-contain drop-shadow-[0_0_40px_rgba(250,24,24,0.35)]"
          draggable={false}
          decoding="async"
          loading="eager"
          fetchPriority="high"
        />

        <div className="forge-splash-pillars mt-6 flex items-center justify-center sm:mt-8">
          {PILLARS.map(({ label, Icon, className }, index) => (
            <div key={label} className="flex items-center">
              {index > 0 && (
                <div
                  className={`forge-splash-divider forge-splash-divider-${index} mx-1 h-9 w-px bg-white/45 sm:mx-2`}
                  aria-hidden
                />
              )}
              <div
                className={`${className} flex min-w-[4.5rem] flex-col items-center px-3 sm:min-w-[5.5rem] sm:px-4`}
              >
                <Icon />
                <span className="mt-2 text-[10px] font-bold tracking-wide text-white sm:text-[11px]">
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: dynamic status + neon line */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center px-6 pb-8 sm:pb-10">
        <SplashStatusBar />
      </div>
    </div>
  );
}
