"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdminPlatformStats } from "@/hooks/useSuperAdminPlatformStats";
import { approveAdminAccount, rejectAdminAccount } from "@/api/auth";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNameInitials } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
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
  XCircle,
  Bell,
} from "lucide-react";

/**
 * Super admin home — live platform stats from DB (gym owners + approvals).
 */
export function SuperAdminDashboardHome() {
  const { user } = useAuth();
  const firstName = (user?.name || "Admin").trim().split(/\s+/)[0];
  const queryClient = useQueryClient();
  const { stats, loading, isFetching } = useSuperAdminPlatformStats(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const approvalRate =
    stats.gymOwners > 0
      ? Math.round((stats.approved / stats.gymOwners) * 100)
      : 0;

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
      toast.success("Gym owner approved — 1-month free trial started.");
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

  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 0% 0%, hsl(0 90% 50% / 0.1), transparent 55%), radial-gradient(ellipse 50% 35% at 100% 0%, hsl(var(--muted) / 0.8), transparent 50%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
        <section className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/95 to-primary/5" />
          <div className="relative flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Platform
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                  <Radio className="h-3 w-3 animate-pulse" />
                  Live
                </span>
                {isFetching && !loading ? (
                  <span className="text-[10px] text-muted-foreground">Syncing…</span>
                ) : null}
              </div>
              <h1 className="font-display text-4xl tracking-wide text-foreground sm:text-5xl md:text-6xl">
                WELCOME,{" "}
                <span className="text-gradient">{firstName.toUpperCase()}</span>
              </h1>
              <p className="max-w-md text-sm text-muted-foreground sm:text-base">
                Live gym-owner pipeline from your database — approve, reject, and track
                growth in realtime.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="gap-2">
                <Link href="/dashboard/progress">
                  <TrendingUp className="h-4 w-4" />
                  Platform progress
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/dashboard/users">
                  <Users className="h-4 w-4" />
                  Manage users
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3 xl:grid-cols-6">
              {[
                {
                  label: "Gym owners",
                  value: String(stats.gymOwners),
                  hint: "total in DB",
                  icon: Building2,
                  href: "/dashboard/users",
                },
                {
                  label: "Pending",
                  value: String(stats.pending),
                  hint: "need decision",
                  icon: Clock,
                  href: "/dashboard/progress",
                },
                {
                  label: "Approved",
                  value: String(stats.approved),
                  hint: `${approvalRate}% rate`,
                  icon: Check,
                  href: "/dashboard/users",
                },
                {
                  label: "Rejected",
                  value: String(stats.rejected),
                  hint: "edit or delete",
                  icon: XCircle,
                  href: "/dashboard/users",
                },
                {
                  label: "New month",
                  value: String(stats.newThisMonth),
                  hint: `${stats.newThisWeek} this week`,
                  icon: UserPlus,
                  href: "/dashboard/progress",
                },
                {
                  label: "Super admins",
                  value: String(stats.superAdmins),
                  hint: "platform",
                  icon: Shield,
                  href: "/dashboard/users",
                },
              ].map((stat) => (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className="bg-card p-4 transition-colors hover:bg-muted/40 sm:p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <stat.icon className="h-4 w-4 text-primary" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {stat.hint}
                    </span>
                  </div>
                  <p className="font-display text-3xl tracking-wide text-foreground sm:text-4xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </Link>
              ))}
            </section>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <section className="space-y-4">
                <div>
                  <h2 className="font-display text-2xl tracking-wide text-foreground sm:text-3xl">
                    OWNER GROWTH
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Gym-owner signups — last 6 months from your DB
                  </p>
                </div>

                <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                  {stats.buckets.every((b) => b.count === 0) ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No gym-owner signups yet. New registrations appear here live.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {stats.buckets.map((b) => (
                        <div key={b.key} className="flex items-center gap-3">
                          <span className="w-14 shrink-0 text-xs text-muted-foreground">
                            {b.label}
                          </span>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{
                                width: `${(b.count / stats.maxJoin) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="w-6 text-right text-xs font-medium tabular-nums">
                            {b.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button asChild variant="outline" size="sm" className="mt-5 w-full gap-2">
                    <Link href="/dashboard/progress">
                      Full progress
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">Recent gym owners</h3>
                      <p className="text-xs text-muted-foreground">
                        Latest accounts from the database
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="gap-1">
                      <Link href="/dashboard/users">
                        All
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                  {stats.recentOwners.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No gym owners yet.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {stats.recentOwners.slice(0, 6).map((row) => (
                        <li
                          key={row.user_id}
                          className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {row.full_name || row.email || "Owner"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {row.gym_name || "—"}
                              {row.gym_city ? ` · ${row.gym_city}` : ""}
                            </p>
                          </div>
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
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-3">
                  {[
                    {
                      title: "Users",
                      body: "Approve, edit, or delete gym owners — including rejected.",
                      href: "/dashboard/users",
                      badge: "Live",
                    },
                    {
                      title: "Statistics",
                      body: "Monthly owner intake and platform facility fees.",
                      href: "/dashboard/statistics",
                      badge: "Live",
                    },
                    {
                      title: "Platform progress",
                      body: "Realtime owner growth and pending approvals.",
                      href: "/dashboard/progress",
                      badge: "Live",
                    },
                    {
                      title: "Notifications",
                      body: "Approval requests and platform alerts.",
                      href: "/dashboard/notifications",
                      badge: "Live",
                    },
                  ].map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="group flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:bg-muted/30 sm:p-5"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold tracking-tight text-foreground">
                            {item.title}
                          </h3>
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.body}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              </section>

              <div className="space-y-6">
                <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <Avatar className="h-12 w-12 border border-primary/30">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="bg-primary/20 text-sm font-semibold text-primary">
                        {getNameInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {user?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Approval rate
                      </p>
                      <p className="text-lg font-semibold tabular-nums">{approvalRate}%</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Pending
                      </p>
                      <p className="text-lg font-semibold tabular-nums">{stats.pending}</p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full gap-2">
                    <Link href="/dashboard/users">
                      <Bell className="h-3.5 w-3.5" />
                      Open users
                    </Link>
                  </Button>
                </section>

                <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Needs approval
                    </h2>
                  </div>
                  {stats.pendingList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No pending gym owners right now.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {stats.pendingList.map((row) => {
                        const busy = actingId === row.user_id;
                        return (
                          <li key={row.user_id} className="space-y-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {row.full_name || row.email || "Owner"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {row.gym_name || "Gym"}
                                {row.gym_city ? ` · ${row.gym_city}` : ""}
                              </p>
                              <p className="text-[11px] text-primary">
                                Approving starts 1-month free trial
                              </p>
                            </div>
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                className="h-8 flex-1 gap-1"
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
                                className="h-8 flex-1 gap-1"
                                disabled={busy || !!actingId}
                                onClick={() => void handleReject(row.user_id)}
                              >
                                <X className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Rejected
                    </h2>
                  </div>
                  {stats.rejectedList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No rejected gym owners.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {stats.rejectedList.map((row) => {
                        const busy = actingId === row.user_id;
                        return (
                          <li key={row.user_id} className="space-y-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {row.full_name || row.email || "Owner"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {row.gym_name || "Gym"}
                              </p>
                            </div>
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                className="h-8 flex-1 gap-1"
                                disabled={busy || !!actingId}
                                onClick={() => void handleApprove(row.user_id)}
                              >
                                {busy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                Re-approve
                              </Button>
                              <Button asChild size="sm" variant="outline" className="h-8">
                                <Link href="/dashboard/users">Edit / delete</Link>
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <Button asChild size="sm" className="mt-4 w-full gap-2">
                    <Link href="/dashboard/users">
                      Manage in Users
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
