"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import { useSplash } from "@/components/marketing/SplashProvider";
import { listPublicPromotions } from "@/api/promotions";

type HomePromotion = {
  id: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
};

function pickFeatured(promotions: HomePromotion[]): HomePromotion | null {
  if (!promotions.length) return null;
  return promotions.find((p) => Boolean(p.image_url)) || promotions[0];
}

/**
 * Daraz-style home popup for the latest published “show on home” promotion.
 * Shows on every home visit until the promo ends (API filters by ends_at).
 * X only closes for this page view — next visit opens it again while live.
 */
export function HomePromotionModal() {
  const { splashReady } = useSplash();
  const titleId = useId();
  const [promo, setPromo] = useState<HomePromotion | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!splashReady) return;

    let cancelled = false;
    let openTimer: number | undefined;
    (async () => {
      try {
        const data = await listPublicPromotions();
        const featured = pickFeatured(data.promotions || []);
        if (cancelled || !featured) return;

        setPromo(featured);
        // Small beat after splash so the popup doesn’t collide with home reveal
        openTimer = window.setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, 400);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
      if (openTimer) window.clearTimeout(openTimer);
    };
  }, [splashReady]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, promo?.id]);

  function dismiss() {
    setOpen(false);
  }

  if (!mounted || !open || !promo) return null;

  const hasImage = Boolean(promo.image_url);
  const ctaHref = promo.cta_href?.trim() || null;
  const ctaLabel = promo.cta_label?.trim() || "Learn more";

  return createPortal(
    <div
      className="fixed inset-0 z-[11000] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity"
        aria-label="Close promotion"
        onClick={dismiss}
      />

      <div
        className="relative z-10 w-full max-w-[min(92vw,420px)] animate-in fade-in zoom-in-95 duration-300"
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute -right-2 -top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-lg ring-1 ring-black/10 transition hover:scale-105 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:-right-3 sm:-top-3"
          aria-label="Close"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>

        <div className="overflow-hidden rounded-2xl bg-[#0D0D0D] shadow-2xl ring-1 ring-white/10">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={promo.image_url!}
              alt=""
              className="block h-auto max-h-[min(48vh,360px)] w-full object-cover"
            />
          ) : null}

          <div className="space-y-3 p-5 sm:p-6">
            <h2 id={titleId} className="font-display text-xl leading-tight text-white sm:text-2xl">
              {promo.title}
            </h2>
            {promo.body?.trim() ? (
              <p className="max-h-[28vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                {promo.body}
              </p>
            ) : null}
            {ctaHref ? (
              <Link
                href={ctaHref}
                onClick={dismiss}
                className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition hover:brightness-110"
              >
                {ctaLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
