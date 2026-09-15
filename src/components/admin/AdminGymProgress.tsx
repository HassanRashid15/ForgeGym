"use client";

import Link from "next/link";
import { useAdminGymStats, formatMoney } from "@/hooks/useAdminGymStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNameInitials } from "@/lib/utils";
import {
  ArrowRight,
  Loader2,
  TrendingUp,
  Users,
  Wallet,
  UserPlus,
  Clock,
  DollarSign,
  Radio,
} from "lucide-react";

/**
 * Admin Progress — live member growth + earnings from DB (Users / Monthly Fee).
 * Updates in realtime when profiles change.
 */
export function AdminGymProgress() {
  const { stats, loading, isFetching, error } = useAdminGymStats(true);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading gym progress…
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
            <h1 className="text-2xl font-bold tracking-tight">Gym Progress</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </span>
            {isFetching ? (
              <span className="text-xs text-muted-foreground">Updating…</span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Realtime from Users & Monthly Fee (stored in your database)
            {stats.gymName ? (
              <>
                {" "}
                · <span className="text-foreground">{stats.gymName}</span>
              </>
            ) : null}
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
            <Link href="/dashboard/monthly-fee">
              <Wallet className="mr-1.5 h-4 w-4" />
              Monthly Fee
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Total members
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats.members}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.active} active · {stats.pending} pending
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
            {stats.newThisWeek} joined in the last 7 days
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Monthly earnings
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.feeAmount > 0
                ? formatMoney(stats.projectedEarnings, stats.monthlyFee)
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.billableCount} billable × {stats.monthlyFee || "fee not set"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Trainers
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats.trainers}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            On your gym roster
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How members come in</CardTitle>
            <CardDescription>New joins over the last 6 months (from DB)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.buckets.every((b) => b.count === 0) ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No join dates yet — approve members from Users to see growth.
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
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">Earnings snapshot</CardTitle>
              <CardDescription>From Monthly Fee billable members</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" asChild>
              <Link href="/dashboard/monthly-fee">
                Open
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">Projected this period</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {stats.feeAmount > 0
                  ? formatMoney(stats.projectedEarnings, stats.monthlyFee)
                  : "Set a monthly fee"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Billable members</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">
                  {stats.billableCount}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Fee / member</p>
                <p className="mt-0.5 text-lg font-semibold">
                  {stats.monthlyFee || "—"}
                </p>
              </div>
            </div>
            {stats.expiringSoon.length > 0 ? (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Fee period ending soon
                </p>
                <ul className="space-y-2">
                  {stats.expiringSoon.map((m) => (
                    <li
                      key={m.userId}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">{m.fullName}</span>
                      <Badge
                        variant="outline"
                        className={
                          (m.daysLeft ?? 99) <= 3
                            ? "border-red-500/40 text-red-400"
                            : "border-amber-500/40 text-amber-400"
                        }
                      >
                        {m.daysLeft}d left
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Recent members</CardTitle>
            <CardDescription>Latest joins from Users (DB)</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" asChild>
            <Link href="/dashboard/users">
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {stats.recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No members yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {stats.recent.map((u) => {
                const joined = u.join_date || u.created_at;
                const status = String(
                  u.membership_status || u.account_status || "active",
                ).toLowerCase();
                return (
                  <li
                    key={u.user_id}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      {u.avatar_url ? (
                        <AvatarImage src={u.avatar_url} alt={u.full_name || ""} />
                      ) : null}
                      <AvatarFallback className="text-[10px] font-semibold">
                        {getNameInitials(u.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {u.full_name || "Member"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email || "—"}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {status}
                    </Badge>
                    <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block">
                      {joined
                        ? new Date(joined).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </span>
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
