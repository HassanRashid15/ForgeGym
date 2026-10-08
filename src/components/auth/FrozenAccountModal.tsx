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

interface FrozenAccountModalProps {
  frozenUntil?: string | null;
  canClose?: boolean;
  onClose?: () => void;
  lockNavigation?: boolean;
  showLogout?: boolean;
}

export function FrozenAccountModal({ frozenUntil, canClose = false, onClose, lockNavigation = true, showLogout = true }: FrozenAccountModalProps) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(true);

  // Lock sidebar / shell nav while the modal is open (only for dashboard/profile pages)
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

  const formatFrozenDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (canClose) {
      setOpen(newOpen);
      if (!newOpen && onClose) onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} defaultOpen>
      <DialogContent
        className={`z-[110] flex max-h-[min(92vh,600px)] w-[calc(100%-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-950 p-0 border-cyan-500/30 text-white ${!canClose ? "[&>button:last-child]:hidden" : ""}`}
        overlayClassName="z-[100] bg-black/95"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 pt-8 sm:px-6 sm:pt-10">
          <DialogHeader className="space-y-3">
            <div className="mb-1 flex items-center justify-center">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-400/40 sm:h-16 sm:w-16">
                  <Snowflake className="h-7 w-7 text-white sm:h-8 sm:w-8" />
                </div>
              </div>
            </div>

            <DialogTitle className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-center text-2xl font-bold text-transparent sm:text-3xl">
              Account Frozen
            </DialogTitle>

            <DialogDescription className="text-center text-sm text-cyan-100 sm:text-base">
              Your account has been temporarily frozen by your gym administrator. You cannot access the dashboard at this time.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4 sm:space-y-4">
            {frozenUntil && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 sm:p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-cyan-300" />
                  <h3 className="font-semibold text-cyan-300">Auto-Unfreeze Date</h3>
                </div>
                <p className="text-cyan-100">
                  Your account will be automatically unfrozen on {formatFrozenDate(frozenUntil)}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-cyan-100">What should I do?</p>
                  <ul className="space-y-1 text-xs text-cyan-200">
                    <li>• Contact your gym administrator to unfreeze your account</li>
                    <li>• This freeze may be due to a gym leave or payment issue</li>
                    <li>• Once unfrozen, you can access your dashboard again</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showLogout && (
          <DialogFooter className="shrink-0 flex-col gap-3 border-t border-cyan-500/30 bg-slate-950/80 px-5 py-4 sm:flex-row sm:px-6">
            <Button
              onClick={() => void logout()}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 sm:w-auto"
            >
              Sign Out
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
