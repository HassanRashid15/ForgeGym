"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";
import {
  approveAdminAccount,
  rejectAdminAccount,
  fetchPendingAdmins,
  type AdminListItem,
} from "@/api/auth";
import { useAuth } from "@/contexts/AuthContext";

type FilterTab = "all" | "pending" | "approved" | "rejected";

function getStatus(admin: AdminListItem): "pending" | "approved" | "rejected" {
  if (admin.status) return admin.status;
  if (admin.admin_approved) return "approved";
  if (admin.admin_rejected_at) return "rejected";
  return "pending";
}

export default function UsersPage() {
  const { user, isLoading, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [pending, setPending] = useState<AdminListItem[]>([]);
  const [approved, setApproved] = useState<AdminListItem[]>([]);
  const [rejected, setRejected] = useState<AdminListItem[]>([]);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; message: string; created_at: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [isLoading, isSuperAdmin, router]);

  const loadAdmins = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPendingAdmins();
      setPending(data.pending || []);
      setApproved(data.approved || []);
      setRejected(data.rejected || []);
      setNotifications((data.notifications as any) || []);
    } catch (err: any) {
      console.warn("Failed to load admins:", err);
      setPending([]);
      setApproved([]);
      setRejected([]);
      setNotifications([]);
      setError(err?.message || "Failed to load admins from database");
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  const handleApprove = async (userId: string) => {
    setApprovingId(userId);
    try {
      await approveAdminAccount(userId);
      toast.success("Admin approved — they can sign in now.");
      await loadAdmins();
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve admin");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setRejectingId(userId);
    try {
      await rejectAdminAccount(userId);
      toast.success("Admin request rejected. You can approve them again later.");
      await loadAdmins();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject admin");
    } finally {
      setRejectingId(null);
    }
  };

  const allAdmins = useMemo(
    () => [...pending, ...approved, ...rejected],
    [pending, approved, rejected],
  );

  const filtered = useMemo(() => {
    const source =
      filter === "pending"
        ? pending
        : filter === "approved"
          ? approved
          : filter === "rejected"
            ? rejected
            : allAdmins;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return source;

    return source.filter((admin) => {
      const haystack = [
        admin.full_name,
        admin.email,
        admin.phone,
        admin.gym_name,
        admin.gym_city,
        admin.gym_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [filter, pending, approved, rejected, allAdmins, searchQuery]);

  if (isLoading || !isSuperAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full overflow-x-hidden">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Admins</h1>
        <p className="text-muted-foreground mt-2">
          Approve, reject, or re-approve gym owner admin accounts
        </p>
      </div>

      {notifications.length > 0 && (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              Approval requests ({notifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.slice(0, 5).map((n) => (
              <div
                key={n.id}
                className="rounded-lg border border-amber-500/20 bg-background/50 px-3 py-2 text-sm"
              >
                <p className="font-medium">{n.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{n.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allAdmins.length}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pending.length}</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{approved.length}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{rejected.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary shrink-0" />
              <CardTitle>Admin Accounts</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadAdmins()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, gym..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All", allAdmins.length],
                  ["pending", "Pending", pending.length],
                  ["approved", "Approved", approved.length],
                  ["rejected", "Rejected", rejected.length],
                ] as const
              ).map(([key, label, count]) => (
                <Button
                  key={key}
                  variant={filter === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(key)}
                >
                  {label}
                  {count > 0 ? ` (${count})` : ""}
                </Button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-10 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading admins from database…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              No admin accounts found{filter !== "all" ? ` in “${filter}”` : ""}.
            </p>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[640px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[32%]">Admin</TableHead>
                    <TableHead className="w-[24%]">Gym</TableHead>
                    <TableHead className="w-[18%]">Status</TableHead>
                    <TableHead className="w-[12%]">Joined</TableHead>
                    <TableHead className="w-[14%] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((admin) => {
                    const status = getStatus(admin);
                    const isSelf = user?.id === admin.user_id;
                    const busy =
                      approvingId === admin.user_id || rejectingId === admin.user_id;

                    return (
                      <TableRow key={admin.user_id}>
                        <TableCell className="align-top">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center ${
                                status === "approved"
                                  ? "bg-emerald-500/10"
                                  : status === "rejected"
                                    ? "bg-destructive/10"
                                    : "bg-amber-500/10"
                              }`}
                            >
                              <Shield
                                className={`h-4 w-4 ${
                                  status === "approved"
                                    ? "text-emerald-500"
                                    : status === "rejected"
                                      ? "text-destructive"
                                      : "text-amber-500"
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {admin.full_name || "Admin"}
                                {isSelf ? (
                                  <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                                ) : null}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {admin.email}
                              </p>
                              {admin.phone ? (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Phone className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{admin.phone}</span>
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          {admin.gym_name || admin.gym_city || admin.gym_type ? (
                            <div className="space-y-0.5 text-sm min-w-0">
                              {admin.gym_name ? (
                                <div className="flex items-center gap-1.5 font-medium truncate">
                                  <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  <span className="truncate">{admin.gym_name}</span>
                                </div>
                              ) : null}
                              {admin.gym_city ? (
                                <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                                  <MapPin className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{admin.gym_city}</span>
                                </div>
                              ) : null}
                              {admin.gym_type ? (
                                <Badge variant="secondary" className="text-[10px] mt-1">
                                  {admin.gym_type}
                                </Badge>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-1 items-start">
                            {status === "pending" && (
                              <Badge className="bg-amber-500 hover:bg-amber-500">Pending</Badge>
                            )}
                            {status === "approved" && (
                              <Badge className="bg-emerald-500 hover:bg-emerald-500">Approved</Badge>
                            )}
                            {status === "rejected" && (
                              <Badge variant="destructive">Rejected</Badge>
                            )}
                            {admin.is_verified ? (
                              <span className="text-[10px] text-muted-foreground">Email verified</span>
                            ) : (
                              <span className="text-[10px] text-amber-500">Email unverified</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {admin.created_at
                              ? new Date(admin.created_at).toLocaleDateString()
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-right">
                          {status === "approved" || isSelf ? (
                            <span className="text-xs text-muted-foreground">Active</span>
                          ) : (
                            <div className="inline-flex flex-col gap-1.5 items-stretch w-[6.5rem]">
                              <Button
                                size="sm"
                                className="h-8 px-2"
                                onClick={() => void handleApprove(admin.user_id)}
                                disabled={busy}
                              >
                                {approvingId === admin.user_id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                <span className="ml-1 text-xs">
                                  {status === "rejected" ? "Approve" : "Approve"}
                                </span>
                              </Button>
                              {status === "pending" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                                  onClick={() => void handleReject(admin.user_id)}
                                  disabled={busy}
                                >
                                  {rejectingId === admin.user_id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5" />
                                  )}
                                  <span className="ml-1 text-xs">Reject</span>
                                </Button>
                              ) : null}
                            </div>
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
