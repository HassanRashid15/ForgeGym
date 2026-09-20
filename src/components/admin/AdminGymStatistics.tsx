"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAdminGymStats, formatMoney, parseFee } from "@/hooks/useAdminGymStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  ArrowRight,
  Clock,
  DollarSign,
  Dumbbell,
  Loader2,
  PieChart,
  Radio,
  Search,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

type MemberFilter = "all" | "trainer" | "concession" | "soon";

/**
 * Gym-owner Stats — live member revenue from Monthly Fee / Users (DB + realtime).
 */
export function AdminGymStatistics() {
  const { stats, billable, loading, isFetching, error } = useAdminGymStats(true);
  const [search, setSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");

  const feeSample = stats.monthlyFee || billable[0]?.monthlyFee || null;
  const withTrainer = billable.filter((m) => m.hasTrainer).length;
  const withConcession = billable.filter((m) => Boolean(m.feeConcession)).length;
  const expiringSoon = billable.filter(
    (m) => typeof m.daysLeft === "number" && m.daysLeft <= 7,
  ).length;

  const revenueBuckets = useMemo(() => {
    const now = new Date();
    const rows: { key: string; label: string; joins: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      rows.push({
        key,
        label: d.toLocaleString(undefined, { month: "short", year: "2-digit" }),
        joins: 0,
        revenue: 0,
      });
    }
    const map = new Map(rows.map((r) => [r.key, r]));

    for (const m of billable) {
      const raw = m.associatedAt;
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const b = map.get(key);
      if (!b) continue;
      b.joins += 1;
      b.revenue += parseFee(m.monthlyFee);
    }
    return rows;
  }, [billable]);

  const maxJoins = Math.max(1, ...revenueBuckets.map((b) => b.joins));
  const maxRevenue = Math.max(1, ...revenueBuckets.map((b) => b.revenue));

  const filteredBillable = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...billable]
      .filter((m) => {
        if (memberFilter === "trainer" && !m.hasTrainer) return false;
        if (memberFilter === "concession" && !m.feeConcession) return false;
        if (
          memberFilter === "soon" &&
          !(typeof m.daysLeft === "number" && m.daysLeft <= 7)
        ) {
          return false;
        }
        if (!q) return true;
        const hay = [m.fullName, m.email, m.membershipType, m.monthlyFee]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99));
  }, [billable, search, memberFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading gym stats…
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

  const tabs: { key: MemberFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: billable.length },
    { key: "trainer", label: "With trainer", count: withTrainer },
    { key: "concession", label: "Concession", count: withConcession },
    { key: "soon", label: "Ending soon", count: expiringSoon },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Stats</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Radio className="h-3 w-3 animate-pulse" />
              Live · your gym
            </span>
            {isFetching ? (
              <span className="text-xs text-muted-foreground">Updating…</span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Member fees and growth from your database
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
              <DollarSign className="h-3.5 w-3.5" />
              Projected revenue
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.projectedEarnings > 0
                ? formatMoney(stats.projectedEarnings, feeSample)
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sum of each billable member&apos;s fee this period
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Billable members
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{stats.billableCount}</CardTitle>
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
            {stats.newThisWeek} in the last 7 days
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Dumbbell className="h-3.5 w-3.5" />
              Trainer add-ons
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{withTrainer}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {withConcession} with fee concession
            {stats.trainerFee ? ` · trainer ${stats.trainerFee}` : ""}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              How members join
            </CardTitle>
            <CardDescription>Billable joins by month (from DB)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {revenueBuckets.every((b) => b.joins === 0) ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No billable members in this window yet.
              </p>
            ) : (
              revenueBuckets.map((b) => (
                <div key={b.key} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs text-muted-foreground">
                    {b.label}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(b.joins / maxJoins) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-medium tabular-nums">
                    {b.joins}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4" />
              Revenue by join month
            </CardTitle>
            <CardDescription>
              Member fees grouped by when they joined (live from DB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {revenueBuckets.every((b) => b.revenue === 0) ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Set gym / trainer fees and approve members to project revenue.
              </p>
            ) : (
              revenueBuckets.map((b) => (
                <div key={b.key} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs text-muted-foreground">
                    {b.label}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all"
                      style={{ width: `${(b.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="min-w-[4.5rem] text-right text-xs font-medium tabular-nums">
                    {b.revenue > 0 ? formatMoney(b.revenue, feeSample) : "—"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" />
              Revenue detail — billable members
            </CardTitle>
            <CardDescription>
              Each row is a live fee from Monthly Fee (gym + trainer − concession when set).
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" asChild>
            <Link href="/dashboard/monthly-fee">
              Open fees
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <Button
                  key={tab.key}
                  size="sm"
                  variant={memberFilter === tab.key ? "default" : "outline"}
                  onClick={() => setMemberFilter(tab.key)}
                >
                  {tab.label} ({tab.count})
                </Button>
              ))}
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search members…"
                className="pl-9"
              />
            </div>
          </div>

          {filteredBillable.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {billable.length === 0
                ? "No billable members yet. Approve members in Users to see revenue here."
                : "No members match these filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Period ends</TableHead>
                    <TableHead>Days left</TableHead>
                    <TableHead className="text-right">Fee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBillable.map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell>
                        <div className="font-medium">{m.fullName || "Member"}</div>
                        <div className="text-xs text-muted-foreground">
                          {m.email || "—"}
                          {m.hasTrainer ? " · +trainer" : ""}
                          {m.feeConcession ? " · concession" : ""}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-sm text-muted-foreground">
                        {m.membershipType || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.periodEnd
                          ? new Date(m.periodEnd).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {typeof m.daysLeft === "number" ? (
                          <Badge
                            variant={m.daysLeft <= 7 ? "destructive" : "outline"}
                            className="tabular-nums"
                          >
                            <Clock className="mr-1 h-3 w-3" />
                            {m.daysLeft}d
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {m.monthlyFee || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
