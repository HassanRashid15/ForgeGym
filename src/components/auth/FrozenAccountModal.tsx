"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Snowflake, Calendar, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const BG_WIDE = "/images/accountfroze_background.png"; // tablet + desktop
const BG_PORTRAIT = "/images/accountfroze_backgroundmobile.png"; // phones

interface FrozenAccountModalProps {
  frozenUntil?: string | null;
  canClose?: boolean;
  onClose?: () => void;
  lockNavigation?: boolean;
  showLogout?: boolean;
  backgroundUrl?: string;
  mobileBackgroundUrl?: string;
}

export function FrozenAccountModal({
  frozenUntil,
  canClose = false,
  onClose,
  lockNavigation = true,
  showLogout = true,
  backgroundUrl = BG_WIDE,
  mobileBackgroundUrl = BG_PORTRAIT,
}: FrozenAccountModalProps) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(true);

  // Lock sidebar / shell nav while the modal is open
  useEffect(() => {
    if (!lockNavigation) return;

    const lockedSelectors = [
      '[data-sidebar="sidebar"]',
      '[data-sidebar="rail"]',
      "header.sticky",
      "aside",
      "nav",
    ];

    const locked: HTMLElement[] = [];
    for (const selector of lockedSelectors) {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        locked.push(el);
        el.dataset.frozenLock = "1";
        el.style.pointerEvents = "none";
        el.setAttribute("aria-hidden", "true");
      });
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      locked.forEach((el) => {
        delete el.dataset.frozenLock;
        el.style.pointerEvents = "";
        el.removeAttribute("aria-hidden");
      });
      document.body.style.overflow = prevOverflow;
    };
  }, [lockNavigation]);

  const formatFrozenDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const handleOpenChange = (newOpen: boolean) => {
    if (canClose) {
      setOpen(newOpen);
      if (!newOpen && onClose) onClose();
    }
  };

  const handleLogout = () => {
    setOpen(false);
    void logout();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={[
          "z-[110] flex w-[calc(100%-1.5rem)] flex-col gap-0",
          "border-red-500/30 bg-slate-950 p-0 text-white sm:max-w-4xl",
          "max-h-[92vh]",
          // phone: height = portrait image height (2:3), never taller than the screen
          "min-h-[min(92vh,calc((100vw_-_1.5rem)*1.5))]",
          // tablet/desktop: height = wide image height (16:9)
          "sm:min-h-[min(92vh,calc(min(100vw_-_1.5rem,56rem)*0.5628))]",
          !canClose ? "[&>button:last-child]:hidden" : "",
        ].join(" ")}
        overlayClassName="z-[100] bg-black/95"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* ───────── Phone background: portrait image fills the dialog ───────── */}
        <img
          src={mobileBackgroundUrl}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center sm:hidden z-0"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/25 to-slate-950/60 sm:hidden z-0" />

        {/* ───────── Tablet / desktop background: full wide image ───────── */}
        <div className="hidden sm:block z-0">
          {/* blurred fill, covers any extra height */}
          <img
            src={backgroundUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-90 blur-2xl"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          {/* sharp image at natural size, fades into the fill */}
          <div className="pointer-events-none absolute left-0 top-0 w-full [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]">
            <img
              src={backgroundUrl}
              alt=""
              aria-hidden="true"
              className="block h-auto w-full"
            />
          </div>
        </div>

        {/* ───────── Content (in front of the image) ───────── */}
        <div className="relative z-10 w-full max-w-full overflow-y-auto overscroll-contain px-5 pb-2 pt-6 sm:px-6">
          {/* Logo in top left */}
          <div className="absolute left-7 top-6 z-20">
            <img
              src="/preloader_logo.png"
              alt="Forge Gym"
              className="h-10 w-auto object-contain"
            />
          </div>
          <DialogHeader className="space-y-3">
            <DialogTitle className="sr-only">Account Frozen</DialogTitle>
            <DialogDescription className="sr-only">
              Your account is currently frozen.
            </DialogDescription>

            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-red-400/20" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-400/40">
                  <Snowflake className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <img
              src="/images/accountfroze_texts.png"
              alt="Account Frozen"
              className="mx-auto h-auto max-h-full max-w-full drop-shadow-2xl"
              style={{ filter: 'contrast(1.2) brightness(1.1)' }}
            />
          </DialogHeader>

          <div className="space-y-3 py-4">
            {frozenUntil && (
              <div className="rounded-xl border border-red-500/30 bg-slate-950/70 p-3 sm:p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-red-300" />
                  <h3 className="font-semibold text-red-300">Auto-Unfreeze Date</h3>
                </div>
                <p className="text-red-100">
                  Your account will be automatically unfrozen on {formatFrozenDate(frozenUntil)}
                </p>
              </div>
            )}

            <div className="rounded-xl border-2 border-red-500 bg-slate-950/70 p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 font-bold text-white" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">What should I do?</p>
                  <ul className="space-y-1 text-xs font-medium text-white">
                    <li>Contact your gym administrator to unfreeze your account</li>
                    <li>This freeze may be due to a gym leave or payment issue</li>
                    <li>Once unfrozen, you can access your dashboard again</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showLogout && (
          <div className="relative z-10 shrink-0 flex flex-col items-center justify-center bg-slate-950/55 px-5 py-6 pt-0">
            <button
              onClick={handleLogout}
              className="cursor-pointer bg-transparent border-0 p-0"
              type="button"
            >
              <img
                src="/images/accountfroze_signout.png"
                alt="Sign Out"
                className="h-14 w-auto max-w-none object-contain hover:opacity-80 transition-opacity"
                onError={(e) => {
                  e.currentTarget.src = '/images/accountfroze_signout.png';
                  e.currentTarget.style.display = 'block';
                }}
              />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}