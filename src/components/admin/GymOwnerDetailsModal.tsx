"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DetailRow } from "@/components/admin/DetailRow";
import type { AdminListItem } from "@/api/auth";
import { Building2, Pencil } from "lucide-react";

type GymOwnerDetailsModalProps = {
  admin: AdminListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (admin: AdminListItem) => void;
};

function statusLabel(admin: AdminListItem) {
  if (admin.status) return admin.status;
  if (admin.admin_approved) return "approved";
  if (admin.admin_rejected_at) return "rejected";
  return "pending";
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export function GymOwnerDetailsModal({
  admin,
  open,
  onOpenChange,
  onEdit,
}: GymOwnerDetailsModalProps) {
  const status = admin ? statusLabel(admin) : "pending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Gym owner details</DialogTitle>
          <DialogDescription>
            Full profile for this gym owner account.
          </DialogDescription>
        </DialogHeader>

        {admin ? (
          <div className="space-y-4">
            {admin.gym_main_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={admin.gym_main_image_url}
                alt={admin.gym_name || "Gym"}
                className="h-40 w-full rounded-lg object-cover ring-1 ring-border"
              />
            ) : (
              <div className="flex h-28 items-center justify-center rounded-lg bg-muted/50 ring-1 ring-border">
                <Building2 className="h-10 w-10 text-muted-foreground/40" />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-foreground">
                {admin.gym_name || "Unnamed gym"}
              </p>
              <Badge
                variant="outline"
                className={
                  status === "approved"
                    ? "border-primary/40 capitalize text-primary"
                    : status === "rejected"
                      ? "border-zinc-600 capitalize text-zinc-400"
                      : "border-amber-500/50 capitalize text-amber-500"
                }
              >
                {status}
              </Badge>
              {admin.gym_type ? (
                <Badge variant="secondary" className="capitalize">
                  {admin.gym_type}
                </Badge>
              ) : null}
            </div>

            <section className="space-y-1">
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-primary">
                Owner
              </h4>
              <DetailRow label="Name" value={admin.full_name} />
              <DetailRow label="Email" value={admin.email} />
              <DetailRow label="Phone" value={admin.phone} />
              <DetailRow label="Joined" value={formatDate(admin.created_at)} />
              <DetailRow
                label="Email verified"
                value={admin.is_verified ? "Yes" : "No"}
              />
            </section>

            <section className="space-y-1">
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-primary">
                Gym
              </h4>
              <DetailRow label="Gym name" value={admin.gym_name} />
              <DetailRow label="Type" value={admin.gym_type} />
              <DetailRow label="City" value={admin.gym_city} />
              <DetailRow
                label="Member monthly fee"
                value={admin.gym_monthly_fee}
              />
              <DetailRow
                label="Trainer fee"
                value={admin.gym_trainer_fee}
              />
            </section>

            <section className="space-y-1">
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-primary">
                Platform
              </h4>
              <DetailRow
                label="Platform monthly fee"
                value={
                  admin.platform_monthly_fee
                    ? `${admin.platform_monthly_fee}/mo`
                    : null
                }
              />
              <DetailRow
                label="Trial status"
                value={admin.trial_status || admin.trial_label}
              />
              <DetailRow
                label="Trial starts"
                value={formatDate(admin.trial_starts_at)}
              />
              <DetailRow
                label="Trial ends"
                value={formatDate(admin.trial_ends_at)}
              />
              {admin.trial_days_left != null && admin.trial_status === "active" ? (
                <DetailRow
                  label="Days left"
                  value={String(admin.trial_days_left)}
                />
              ) : null}
              <DetailRow
                label="Rejected at"
                value={formatDate(admin.admin_rejected_at)}
              />
            </section>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {admin && onEdit ? (
            <Button
              type="button"
              className="gap-2"
              onClick={() => {
                onOpenChange(false);
                onEdit(admin);
              }}
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
