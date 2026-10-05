"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type GymWhatsAppConnectProps = {
  gymName: string;
  phone?: string | null;
  /** Optional second number (emergency contact) */
  optionalPhone?: string | null;
  /** Optional URL for joining the gym */
  joinGymHref?: string;
};

/** Normalize display phone → WhatsApp wa.me digits (PK-friendly). */
export function toWhatsAppDigits(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Local PK mobile 03XXXXXXXXX → 923XXXXXXXXX
  if (digits.startsWith("0") && digits.length === 11) {
    digits = `92${digits.slice(1)}`;
  }
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

function phonesEqual(a: string, b: string): boolean {
  const da = toWhatsAppDigits(a);
  const db = toWhatsAppDigits(b);
  return !!da && !!db && da === db;
}

function whatsappHref(digits: string, gymName: string): string {
  const text = encodeURIComponent(
    `Hi! I'm interested in joining ${gymName} on Forge Gym.`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

/**
 * Custom modal (no Radix RemoveScroll) so opening it never adds
 * body padding-right / layout shift on the right edge.
 */
export function GymWhatsAppConnect({
  gymName,
  phone,
  optionalPhone,
  joinGymHref,
}: GymWhatsAppConnectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const options = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      display: string;
      digits: string;
    }> = [];

    const primary = phone?.trim();
    if (primary) {
      const digits = toWhatsAppDigits(primary);
      if (digits) {
        list.push({
          id: "primary",
          label: "Main number",
          display: primary,
          digits,
        });
      }
    }

    const secondary = optionalPhone?.trim();
    if (secondary && (!primary || !phonesEqual(primary, secondary))) {
      const digits = toWhatsAppDigits(secondary);
      if (digits) {
        list.push({
          id: "optional",
          label: "Alternate number",
          display: secondary,
          digits,
        });
      }
    }

    return list;
  }, [phone, optionalPhone]);

  useEffect(() => setMounted(true), []);

  // Lock scroll without scrollbar compensation (no padding-right on body)
  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (options.length === 0) return null;

  const modal =
    mounted && open
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="wa-connect-title"
              className="relative z-10 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg"
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-4 space-y-1.5 pr-8 text-center sm:text-left">
                <h2
                  id="wa-connect-title"
                  className="text-lg font-semibold leading-none tracking-tight"
                >
                  Connect on WhatsApp
                </h2>
                <p className="text-sm text-muted-foreground">
                  {options.length > 1
                    ? `Choose a number to message ${gymName}.`
                    : `Message ${gymName} on WhatsApp.`}
                </p>
              </div>

              <div className="space-y-3">
                {options.map((opt) => (
                  <a
                    key={opt.id}
                    href={whatsappHref(opt.digits, gymName)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-[#25D366]/50 hover:bg-[#25D366]/5"
                    onClick={() => setOpen(false)}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]">
                      <MessageCircle className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {opt.label}
                      </span>
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {opt.display}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col sm:flex-row justify-end gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5 bg-background border-t border-border">
        {joinGymHref && (
          <div className="pointer-events-auto w-full max-w-[min(100%,20rem)] sm:max-w-xs">
            <Button
              asChild
              size="lg"
              className="h-12 w-full gap-2 rounded-full bg-[#EF1111] text-sm font-semibold text-white shadow-lg hover:bg-[#C90808] sm:text-base"
            >
              <Link href={joinGymHref}>
                Join this gym
                <ArrowRight className="h-5 w-5 shrink-0" />
              </Link>
            </Button>
          </div>
        )}
        <div className="pointer-events-auto w-full max-w-[min(100%,20rem)] sm:max-w-xs">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full gap-2 rounded-full bg-[#25D366] text-sm font-semibold text-white shadow-lg hover:bg-[#1ebe57] sm:text-base"
            onClick={() => setOpen(true)}
          >
            <MessageCircle className="h-5 w-5 shrink-0" />
            Connect on WhatsApp
          </Button>
        </div>
      </div>
      {modal}
    </>
  );
}
