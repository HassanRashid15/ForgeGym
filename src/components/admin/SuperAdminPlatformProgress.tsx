"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useSuperAdminPlatformStats } from "@/hooks/useSuperAdminPlatformStats";
import { approveAdminAccount, rejectAdminAccount } from "@/api/auth";
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getNameInitials } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  Check,
  Clock,
  Loader2,
  Radio,
  Shield,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";

/**
 * Super admin Progress — live gym-owner growth from DB + approve/reject (persisted).
 */
export function SuperAdminPlatformProgress() {
  const queryClient = useQueryClient();
  const { stats, loading, isFetching, error } = useSuperAdminPlatformStats(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.managedUsers }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingAdmins }),
    ]);
  };

  const handleApprove = async (userId: string) => {
    setActingId(userId);
    try {
      await approveAdminAccount(userId);
      toast.success("Gym owner approved — saved in database.");
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActingId(userId);
    try {
      await rejectAdminAccount(userId);
      toast.success("Gym owner rejected — saved in database.");
      await refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading platform progress…
      </div>
    );
  }

  if (error) {
    return (
      <p className="m-6 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Platform Progress</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </span>
            {isFetching ? (
              <span className="text-xs text-muted-foreground">Updating…</span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Realtime gym-owner growth — approve/reject writes to the database
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/users">
              <Users className="mr-1.5 h-4 w-4" />
              Users
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              Dashboard
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Gym owners
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats.gymOwners}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.approved} approved · {stats.pending} pending
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              New this month
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats.newThisMonth}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.newThisWeek} registered in the last 7 days
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Awaiting approval
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats.pending}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Handle below — updates profiles in DB
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Rejected
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats.rejected}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.superAdmins} platform super admin
            {stats.superAdmins === 1 ? "" : "s"}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How gym owners come in</CardTitle>
            <CardDescription>New owner signups over the last 6 months (from DB)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.buckets.every((b) => b.count === 0) ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No owner signups yet — new registrations show here live.
              </p>
            ) : (
              stats.buckets.map((b) => (
                <div key={b.key} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs text-muted-foreground">
                    {b.label}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(b.count / stats.maxJoin) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs font-medium tabular-nums">
                    {b.count}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending approvals</CardTitle>
            <CardDescription>
              Approve or reject gym owners — status saved to the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.pendingList.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Queue is clear — nothing pending.
              </p>
            ) : (
              stats.pendingList.map((row) => {
                const busy = actingId === row.user_id;
                return (
                  <div
                    key={row.user_id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                        {getNameInitials(row.full_name || row.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {row.full_name || row.email || "Owner"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.gym_name || "Gym"}
                        {row.gym_city ? ` · ${row.gym_city}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <Button
                        size="sm"
                        className="h-8 gap-1"
                        disabled={busy || !!actingId}
                        onClick={() => void handleApprove(row.user_id)}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1"
                        disabled={busy || !!actingId}
                        onClick={() => void handleReject(row.user_id)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
            <Button asChild variant="outline" size="sm" className="w-full gap-2">
              <Link href="/dashboard/users">
                Open Users
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Recent gym owners
          </CardTitle>
          <CardDescription>Latest owner accounts in the database</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentOwners.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No gym owners yet.
            </p>
          ) : (
            <ul className="divide-y">
              {stats.recentOwners.map((row) => {
                const isPending = row.status === "pending" || !row.status;
                const busy = actingId === row.user_id;
                return (
                  <li
                    key={row.user_id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-muted text-xs font-semibold">
                          {getNameInitials(row.full_name || row.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.full_name || row.email || "Owner"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.gym_name || "—"}
                          {row.gym_city ? ` · ${row.gym_city}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          row.status === "approved"
                            ? "default"
                            : row.status === "rejected"
                              ? "destructive"
                              : "outline"
                        }
                        className="capitalize"
                      >
                        {row.status || "pending"}
                      </Badge>
                      {isPending ? (
                        <>
                          <Button
                            size="sm"
                            className="h-8"
                            disabled={busy || !!actingId}
                            onClick={() => void handleApprove(row.user_id)}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Approve"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={busy || !!actingId}
                            onClick={() => void handleReject(row.user_id)}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
