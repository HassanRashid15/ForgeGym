"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  Users,
  Eye,
} from "lucide-react";
import type { ManagedUser } from "@/api/admin-users";

type MemberStatusFilter = "all" | "pending" | "active" | "rejected";

function memberStatus(row: ManagedUser): MemberStatusFilter {
  // Platform admins / gym owners — use admin_approved, not membership_status
  if (row.is_super_admin) return "active";
  if (row.role === "admin") {
    if (row.admin_approved === true) return "active";
    const status = String(row.membership_status || row.account_status || "").toLowerCase();
    if (status === "rejected") return "rejected";
    return "pending";
  }

  const status = String(row.membership_status || row.account_status || "").toLowerCase();
  if (status === "rejected") return "rejected";
  if (
    row.role === "user" &&
    row.admin_approved !== true &&
    (status === "pending" || !status)
  ) {
    return "pending";
  }
  if (status === "pending") return "pending";
  return "active";
}

function statusLabel(row: ManagedUser, status: MemberStatusFilter): string {
  if (row.is_super_admin || row.role === "admin") {
    if (status === "pending") return "pending approval";
    if (status === "rejected") return "rejected";
    return "active";
  }
  if (status === "pending") return "pending approval";
  if (status === "rejected") return "rejected";
  return row.account_status || row.membership_status || "active";
}

function planLabel(row: ManagedUser): string {
  if (row.is_super_admin) return "Platform";
  if (row.role === "admin") return row.gym_name || "Gym owner";
  if (row.role === "staff") return row.staff_type || "Staff";
  return row.specialization || row.membership_type || "—";
}

export function MembersTable({
  loading,
  members,
  totalCount,
  search,
  setSearch,
  currentUserId,
  deletingId,
  approvingId,
  rejectingId,
  onView,
  onEdit,
  onDelete,
  onApproveMember,
  onRejectMember,
  showRole,
  title = "Staff & members",
  description,
  hidePending = false,
}: {
  loading: boolean;
  members: ManagedUser[];
  totalCount: number;
  search: string;
  setSearch: (v: string) => void;
  currentUserId?: string;
  deletingId: string | null;
  approvingId: string | null;
  rejectingId: string | null;
  onView: (row: ManagedUser) => void;
  onEdit: (row: ManagedUser) => void;
  onDelete: (row: ManagedUser) => void;
  onApproveMember: (userId: string) => void;
  onRejectMember: (userId: string) => void;
  showRole: boolean;
  title?: string;
  description?: string;
  hidePending?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<MemberStatusFilter>("all");

  const pendingMembers = hidePending
    ? []
    : members.filter((m) => memberStatus(m) === "pending" && m.role === "user");

  const rejectedMembers = hidePending
    ? []
    : members.filter((m) => memberStatus(m) === "rejected" && m.role === "user");

  const counts = useMemo(() => {
    let pending = 0;
    let active = 0;
    let rejected = 0;
    for (const m of members) {
      const s = memberStatus(m);
      if (s === "pending") pending += 1;
      else if (s === "rejected") rejected += 1;
      else active += 1;
    }
    return { pending, active, rejected };
  }, [members]);

  const visibleMembers = useMemo(() => {
    if (statusFilter === "all") return members;
    return members.filter((m) => memberStatus(m) === statusFilter);
  }, [members, statusFilter]);

  return (
    <div className="space-y-6">
      {pendingMembers.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-amber-500" />
              Pending memberships ({pendingMembers.length})
            </CardTitle>
            <CardDescription>
              Customers who registered for your gym and are waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingMembers.map((row) => (
              <div
                key={row.user_id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{row.full_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{row.email || "—"}</p>
                  {row.phone && (
                    <p className="text-xs text-muted-foreground">{row.phone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={approvingId === row.user_id || rejectingId === row.user_id}
                    onClick={() => onApproveMember(row.user_id)}
                  >
                    {approvingId === row.user_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-destructive"
                    disabled={approvingId === row.user_id || rejectingId === row.user_id}
                    onClick={() => onRejectMember(row.user_id)}
                  >
                    {rejectingId === row.user_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!hidePending && rejectedMembers.length > 0 && (
        <Card className="border-zinc-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              Rejected ({rejectedMembers.length})
            </CardTitle>
            <CardDescription>
              Re-approve, edit, or delete rejected members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rejectedMembers.slice(0, 5).map((row) => (
              <div
                key={row.user_id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{row.full_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{row.email || "—"}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={approvingId === row.user_id}
                    onClick={() => onApproveMember(row.user_id)}
                  >
                    {approvingId === row.user_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={deletingId === row.user_id}
                    onClick={() => onDelete(row)}
                  >
                    {deletingId === row.user_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              {title}
            </CardTitle>
            <CardDescription>
              {description ||
                (search.trim()
                  ? `${visibleMembers.length} of ${totalCount}`
                  : `${totalCount} total`)}
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            {!hidePending && (
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["all", "All"],
                    ["pending", `Pending (${counts.pending})`],
                    ["active", `Active (${counts.active})`],
                    ["rejected", `Rejected (${counts.rejected})`],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={statusFilter === key ? "default" : "outline"}
                    onClick={() => setStatusFilter(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email…"
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : visibleMembers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    {showRole && <TableHead>Role</TableHead>}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleMembers.map((row) => {
                    const isSelf = row.user_id === currentUserId;
                    const status = memberStatus(row);
                    const canDecide =
                      row.role === "user" &&
                      (status === "pending" || status === "rejected");
                    return (
                      <TableRow key={row.user_id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            {row.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.avatar_url}
                                alt=""
                                className="h-9 w-9 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                                {(row.full_name || row.email || "?")
                                  .split(/\s+/)
                                  .map((p) => p[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </div>
                            )}
                            <div>
                              {row.full_name || "—"}
                              {isSelf && (
                                <Badge variant="secondary" className="ml-2 text-[10px]">
                                  You
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{row.email || "—"}</TableCell>
                        <TableCell>{row.phone || "—"}</TableCell>
                        <TableCell className="capitalize">
                          {planLabel(row)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              status === "rejected"
                                ? "border-zinc-500 capitalize text-zinc-400"
                                : status === "pending"
                                  ? "border-amber-500 capitalize text-amber-500"
                                  : "capitalize"
                            }
                          >
                            {statusLabel(row, status)}
                          </Badge>
                          {row.role === "staff" && row.login_enabled === false && (
                            <Badge variant="secondary" className="ml-1 text-[10px]">
                              No login
                            </Badge>
                          )}
                        </TableCell>
                        {showRole && (
                          <TableCell>
                            <Badge
                              className={
                                row.is_super_admin
                                  ? "bg-violet-600 text-white capitalize"
                                  : row.role === "admin"
                                    ? "bg-red-600 text-white capitalize"
                                    : row.role === "trainer"
                                      ? "bg-sky-600 text-white capitalize"
                                      : row.role === "staff"
                                        ? "bg-amber-600 text-white capitalize"
                                        : "capitalize"
                              }
                              variant={
                                row.role === "user" && !row.is_super_admin
                                  ? "outline"
                                  : "default"
                              }
                            >
                              {row.is_super_admin ? "super admin" : row.role}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {canDecide && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-emerald-600"
                                  disabled={approvingId === row.user_id}
                                  onClick={() => onApproveMember(row.user_id)}
                                  title="Approve"
                                >
                                  {approvingId === row.user_id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                </Button>
                                {status !== "rejected" && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-destructive"
                                    disabled={rejectingId === row.user_id}
                                    onClick={() => onRejectMember(row.user_id)}
                                    title="Reject"
                                  >
                                    {rejectingId === row.user_id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <XCircle className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                              </>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onView(row)}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onEdit(row)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!isSelf && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                disabled={deletingId === row.user_id}
                                onClick={() => onDelete(row)}
                                title="Delete"
                              >
                                {deletingId === row.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
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
