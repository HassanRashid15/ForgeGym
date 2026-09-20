"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Phone,
  Calendar,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  MapPin,
  Building2,
  Pencil,
  Trash2,
} from "lucide-react";
import type { AdminListItem } from "@/api/auth";

export type FilterTab = "all" | "pending" | "approved" | "rejected";

function LiveTrialLabel({ endsAt }: { endsAt: string }) {
  const [label, setLabel] = useState("Trial…");

  useEffect(() => {
    const tick = () => {
      const end = new Date(endsAt).getTime();
      if (Number.isNaN(end)) {
        setLabel("Trial");
        return;
      }
      const ms = Math.max(0, end - Date.now());
      if (ms <= 0) {
        setLabel("Trial ended");
        return;
      }
      const days = Math.floor(ms / 86_400_000);
      const hours = Math.floor((ms % 86_400_000) / 3_600_000);
      const mins = Math.floor((ms % 3_600_000) / 60_000);
      setLabel(
        days > 0
          ? `Trial · ${days}d ${String(hours).padStart(2, "0")}h left`
          : `Trial · ${hours}h ${String(mins).padStart(2, "0")}m left`,
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return <span className="text-[11px] text-primary">{label}</span>;
}

function getStatus(admin: AdminListItem): "pending" | "approved" | "rejected" {
  if (admin.status) return admin.status;
  if (admin.admin_approved) return "approved";
  if (admin.admin_rejected_at) return "rejected";
  return "pending";
}

export function OwnersSection({
  loading,
  error,
  notifications,
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
  pendingCount,
  approvedCount,
  rejectedCount,
  filtered,
  approvingId,
  rejectingId,
  deletingId,
  onApprove,
  onReject,
  onEdit,
  onDelete,
  onRefresh,
}: {
  loading: boolean;
  error: string | null;
  notifications: Array<{ id: string; title: string; message: string; created_at: string }>;
  filter: FilterTab;
  setFilter: (v: FilterTab) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  filtered: AdminListItem[];
  approvingId: string | null;
  rejectingId: string | null;
  deletingId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (admin: AdminListItem) => void;
  onDelete: (admin: AdminListItem) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent approval requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{n.title}</p>
                <p className="text-muted-foreground">{n.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["pending", `Pending (${pendingCount})`],
              ["approved", `Approved (${approvedCount})`],
              ["rejected", `Rejected (${rejectedCount})`],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={onRefresh}>
            Refresh
          </Button>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gym owners…"
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No gym owner accounts match.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead>Gym</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((admin) => {
                    const status = getStatus(admin);
                    const busy =
                      approvingId === admin.user_id ||
                      rejectingId === admin.user_id ||
                      deletingId === admin.user_id;
                    return (
                      <TableRow key={admin.user_id}>
                        <TableCell>
                          <div className="font-medium">{admin.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{admin.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            {admin.gym_name || "—"}
                          </div>
                          {(admin.gym_city || admin.gym_type) && (
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {admin.gym_city && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {admin.gym_city}
                                </span>
                              )}
                              {admin.gym_type && <span>{admin.gym_type}</span>}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {admin.phone ? (
                            <span className="inline-flex items-center gap-1 text-sm">
                              <Phone className="h-3.5 w-3.5" />
                              {admin.phone}
                            </span>
                          ) : (
                            "—"
                          )}
                          {admin.created_at && (
                            <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(admin.created_at).toLocaleDateString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
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
                            <Shield className="mr-1 h-3 w-3" />
                            {status}
                          </Badge>
                          {admin.trial_status === "active" && admin.trial_ends_at && (
                            <LiveTrialLabel endsAt={admin.trial_ends_at} />
                          )}
                          {admin.trial_status === "pending_approval" && status === "pending" && (
                            <span className="text-[11px] text-muted-foreground">
                              Trial starts on approve
                            </span>
                          )}
                          {admin.trial_status === "expired" && (
                            <span className="text-[11px] text-destructive">Trial ended</span>
                          )}
                          {admin.platform_monthly_fee ? (
                            <span className="text-[11px] text-muted-foreground">
                              Fee {admin.platform_monthly_fee}/mo
                            </span>
                          ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {status !== "approved" && (
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => onApprove(admin.user_id)}
                              >
                                {approvingId === admin.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="mr-1 h-4 w-4" />
                                    Approve
                                  </>
                                )}
                              </Button>
                            )}
                            {status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => onReject(admin.user_id)}
                              >
                                {rejectingId === admin.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="mr-1 h-4 w-4" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Edit"
                              disabled={busy}
                              onClick={() => onEdit(admin)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              title="Delete"
                              disabled={busy}
                              onClick={() => onDelete(admin)}
                            >
                              {deletingId === admin.user_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
