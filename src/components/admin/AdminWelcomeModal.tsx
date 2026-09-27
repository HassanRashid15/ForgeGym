"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Users,
  TrendingUp,
  Building2,
  ShieldCheck,
  Dumbbell,
  Calendar,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AdminWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gymName?: string;
  userName?: string;
}

export function AdminWelcomeModal({
  isOpen,
  onClose,
  gymName,
  userName,
}: AdminWelcomeModalProps) {
  const { refreshUser } = useAuth();
  const [isClosing, setIsClosing] = useState(false);
  const [enableClasses, setEnableClasses] = useState(false);
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [enableMembership, setEnableMembership] = useState(false);

  // Lock sidebar / shell nav while the welcome modal is open
  useEffect(() => {
    if (!isOpen) return;

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
        el.dataset.welcomeLock = "1";
        el.style.pointerEvents = "none";
        el.setAttribute("aria-hidden", "true");
      });
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      locked.forEach((el) => {
        delete el.dataset.welcomeLock;
        el.style.pointerEvents = "";
        el.removeAttribute("aria-hidden");
      });
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // Reset toggles when modal opens fresh
  useEffect(() => {
    if (isOpen) {
      setEnableClasses(false);
      setEnableSchedule(false);
      setEnableMembership(false);
    }
  }, [isOpen]);

  const markShownAndClose = async (celebrate: boolean) => {
    if (isClosing) return;
    setIsClosing(true);
    try {
      await fetch("/api/admin/welcome-modal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableClasses, enableSchedule, enableMembership }),
      });
      await refreshUser();
      onClose();
      if (celebrate) toast.success("Welcome to your gym dashboard!");
    } catch (error) {
      console.error("Failed to mark welcome modal as shown:", error);
      onClose();
    } finally {
      setIsClosing(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      void markShownAndClose(false);
    }
  };

  const firstName = userName?.split(/\s+/)[0] || "Owner";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="z-[110] max-w-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-zinc-800 text-white"
        overlayClassName="z-[100] bg-black/95"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>

          <DialogTitle className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
            Congratulations, {firstName}!
          </DialogTitle>

          <DialogDescription className="text-center text-zinc-300 text-base">
            Your gym account has been approved by the superadmin. You&apos;re now ready to manage your gym and build your community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-emerald-400">Your Gym</h3>
            </div>
            <p className="text-zinc-300">{gymName || "Your gym is now live"}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-center">
              <Users className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-200">Manage Members</p>
              <p className="text-xs text-zinc-400 mt-1">Approve & oversee</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-center">
              <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-200">Track Growth</p>
              <p className="text-xs text-zinc-400 mt-1">Real-time stats</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-center">
              <ShieldCheck className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-zinc-200">Full Control</p>
              <p className="text-xs text-zinc-400 mt-1">Complete access</p>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-zinc-100">Optional features</p>
              <p className="text-xs text-zinc-400 mt-1">
                Turn on only what your gym uses. You can change this later in Gym settings.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-3">
              <div className="flex items-start gap-3 min-w-0">
                <Dumbbell className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <Label htmlFor="welcome-enable-classes" className="text-sm font-medium text-zinc-100">
                    Classes
                  </Label>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Show Classes in the sidebar for group sessions
                  </p>
                </div>
              </div>
              <Switch
                id="welcome-enable-classes"
                checked={enableClasses}
                onCheckedChange={setEnableClasses}
                disabled={isClosing}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-3">
              <div className="flex items-start gap-3 min-w-0">
                <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <Label htmlFor="welcome-enable-schedule" className="text-sm font-medium text-zinc-100">
                    Schedules
                  </Label>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Show Schedule in the sidebar for weekly timetables
                  </p>
                </div>
              </div>
              <Switch
                id="welcome-enable-schedule"
                checked={enableSchedule}
                onCheckedChange={setEnableSchedule}
                disabled={isClosing}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-700/80 bg-zinc-900/60 px-3 py-3">
              <div className="flex items-start gap-3 min-w-0">
                <CreditCard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <Label htmlFor="welcome-enable-membership" className="text-sm font-medium text-zinc-100">
                    Memberships
                  </Label>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Show Membership in the sidebar when you&apos;re ready for plans & billing
                  </p>
                </div>
              </div>
              <Switch
                id="welcome-enable-membership"
                checked={enableMembership}
                onCheckedChange={setEnableMembership}
                disabled={isClosing}
              />
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">What&apos;s Next?</p>
                <ul className="text-xs text-zinc-300 space-y-1">
                  <li>• Set up your monthly gym fees</li>
                  <li>• Approve pending member requests</li>
                  <li>• Add trainers to your gym roster</li>
                  <li>• Start tracking member progress</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => void markShownAndClose(false)}
            disabled={isClosing}
            className="w-full sm:w-auto border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Close
          </Button>
          <Button
            onClick={() => void markShownAndClose(true)}
            disabled={isClosing}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
          >
            {isClosing ? (
              <>Getting Started...</>
            ) : (
              <>
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
