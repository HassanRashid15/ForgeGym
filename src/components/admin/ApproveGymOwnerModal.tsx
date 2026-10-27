"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { AdminListItem } from "@/api/auth";
import {
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Mail,
  Phone,
  Sparkles,
  User,
} from "lucide-react";

type ApproveGymOwnerModalProps = {
  admin: AdminListItem | null;
  open: boolean;
  confirming: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (platformMonthlyFee: string) => void;
};

function defaultFee(admin: AdminListItem | null): string {
  if (!admin) return "";
  return (
    (admin.platform_monthly_fee || "").trim() ||
    (admin.gym_monthly_fee || "").trim() ||
    ""
  );
}

/**
 * Opens when super admin clicks Approve.
 * Shows account info, sets platform monthly fee, then confirm.
 */
export function ApproveGymOwnerModal({
  admin,
  open,
  confirming,
  onOpenChange,
  onConfirm,
}: ApproveGymOwnerModalProps) {
  const [fee, setFee] = useState("");
  const isMember = admin?.kind === "platform_member";

  useEffect(() => {
    if (open) setFee(defaultFee(admin));
  }, [open, admin]);

  const feeReady = fee.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {isMember ? "Approve platform member" : "Approve gym owner"}
          </DialogTitle>
          <DialogDescription>
            Review details, set the monthly amount, then confirm. They accept the
            fee on their dashboard to unlock <strong>1 month of access</strong>
            , or request a concession.
          </DialogDescription>
        </DialogHeader>

        {admin ? (
          <div className="space-y-4">
            {!isMember ? (
              admin.gym_main_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={admin.gym_main_image_url}
                  alt={admin.gym_name || "Gym"}
                  className="h-36 w-full rounded-lg object-cover ring-1 ring-border"
                />
              ) : (
                <div className="flex h-28 items-center justify-center rounded-lg bg-muted/50 ring-1 ring-border">
                  <Building2 className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )
            ) : null}

            <div className="space-y-2 rounded-lg border bg-card/50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foreground">
                  {isMember
                    ? admin.full_name || "Platform member"
                    : admin.gym_name || "Unnamed gym"}
                </p>
                {isMember ? (
                  <Badge variant="outline">Self-training</Badge>
                ) : admin.gym_type ? (
                  <Badge variant="outline" className="capitalize">
                    {admin.gym_type}
                  </Badge>
                ) : null}
              </div>
              {!isMember && admin.gym_city ? (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {admin.gym_city}
                </p>
              ) : null}
              <div className="grid gap-1.5 pt-1 text-sm text-muted-foreground sm:grid-cols-2">
                <p className="flex items-center gap-1.5 truncate">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{admin.full_name || "—"}</span>
                </p>
                <p className="flex items-center gap-1.5 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{admin.email || "—"}</span>
                </p>
                {admin.phone ? (
                  <p className="flex items-center gap-1.5 truncate sm:col-span-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {admin.phone}
                  </p>
                ) : null}
              </div>
            </div>

            {!isMember ? (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Fee set by gym owner
                </p>
                <p className="text-muted-foreground">
                  Member monthly fee:{" "}
                  <span className="font-semibold text-foreground">
                    {admin.gym_monthly_fee?.trim() || "Not set"}
                  </span>
                  {admin.gym_trainer_fee?.trim()
                    ? ` · Trainer fee: ${admin.gym_trainer_fee}`
                    : ""}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="platform-monthly-fee">
                {isMember
                  ? "Platform monthly fee"
                  : "Platform monthly fee (after trial)"}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="platform-monthly-fee"
                  inputMode="decimal"
                  placeholder="e.g. 49"
                  className="pl-7"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  disabled={confirming}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Required. Sent to their dashboard to accept or request a concession.
              </p>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              Confirming approves the account and sends this fee.{" "}
              <strong>1-month dashboard access</strong> starts when they accept
              (or when you approve their concession).
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={confirming}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!admin || confirming || !feeReady}
            onClick={() => onConfirm(fee.trim())}
            className="gap-2"
          >
            {confirming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Confirm & send fee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
