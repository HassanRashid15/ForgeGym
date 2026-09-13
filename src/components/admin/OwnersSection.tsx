"use client";

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
} from "lucide-react";
import type { AdminListItem } from "@/api/auth";

export type FilterTab = "all" | "pending" | "approved" | "rejected";

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
  onApprove,
  onReject,
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
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
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
                          <Badge
                            className={
                              status === "approved"
                                ? "bg-emerald-500 text-white"
                                : status === "rejected"
                                  ? "bg-zinc-600 text-white"
                                  : "bg-amber-500 text-white"
                            }
                          >
                            <Shield className="mr-1 h-3 w-3" />
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {status !== "approved" && (
                            <Button
                              size="sm"
                              className="mr-2"
                              disabled={approvingId === admin.user_id}
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
                              disabled={rejectingId === admin.user_id}
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
