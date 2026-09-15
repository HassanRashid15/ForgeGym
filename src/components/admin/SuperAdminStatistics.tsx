"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSuperAdminPlatformStats } from "@/hooks/useSuperAdminPlatformStats";
import { parseFee, formatMoney } from "@/hooks/useAdminGymStats";
import { fetchPlatformSettings, updatePlatformSettings, type AdminListItem } from "@/api/auth";
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  Clock,
  DollarSign,
  Loader2,
  PieChart,
  Radio,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

function daysUntil(date: Date, now = new Date()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** Monthly facility period from owner join / created_at. */
function facilityPeriod(anchorIso: string | null | undefined, now = new Date()) {
  if (!anchorIso) {
    return {
      periodStart: null as string | null,
      periodEnd: null as string | null,
      daysLeft: null as number | null,
    };
  }
  const anchor = new Date(anchorIso);
  if (Number.isNaN(anchor.getTime())) {
    return { periodStart: null, periodEnd: null, daysLeft: null };
  }
  const periodStart = new Date(anchor);
  while (true) {
    const next = new Date(periodStart);
    next.setMonth(next.getMonth() + 1);
    if (next > now) break;
    periodStart.setMonth(periodStart.getMonth() + 1);
  }
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    daysLeft: Math.max(0, daysUntil(periodEnd, now)),
  };
}

function joinedAt(u: AdminListItem) {
  return u.created_at || null;
}

/**
 * Super admin Statistics — monthly gym-owner intake + platform facility fees (DB).
 */
export function SuperAdminStatistics() {
  const queryClient = useQueryClient();
  const { stats, loading, isFetching, error } = useSuperAdminPlatformStats(true);
  const [feeDraft, setFeeDraft] = useState("");
  const [savingFee, setSavingFee] = useState(false);

  const feeQuery = useQuery({
    queryKey: queryKeys.platformSettings,
    queryFn: fetchPlatformSettings,
  });

  const feeLabel = feeQuery.data?.platformFacilityFee || "";
  const feeStored = feeQuery.data?.stored === true;

  useEffect(() => {
    setFeeDraft(feeQuery.data?.platformFacilityFee || "");
  }, [feeQuery.data?.platformFacilityFee]);

  const feeAmount = parseFee(feeLabel);

  const saveFee = async () => {
    const next = feeDraft.trim();
    if (!next) {
      toast.error("Enter a facility fee before saving");
      return;
    }
    setSavingFee(true);
    try {
      await updatePlatformSettings(next);
      toast.success("Facility fee saved to database");
      await queryClient.invalidateQueries({ queryKey: queryKeys.platformSettings });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not save fee");
    } finally {
      setSavingFee(false);
    }
  };

  const billable = stats.allApproved;
  const projectedRevenue = billable.length * feeAmount;

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

    for (const u of stats.allOwners) {
      const raw = joinedAt(u);
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const b = map.get(key);
      if (!b) continue;
      b.joins += 1;
      if (u.status === "approved" || u.admin_approved) {
        b.revenue += feeAmount;
      }
    }
    return rows;
  }, [stats.allOwners, feeAmount]);

  const maxJoins = Math.max(1, ...revenueBuckets.map((b) => b.joins));
  const maxRevenue = Math.max(1, ...revenueBuckets.map((b) => b.revenue));

  const billingRows = useMemo(() => {
    return [...billable]
      .map((owner) => {
        const period = facilityPeriod(joinedAt(owner));
        return { owner, ...period };
      })
      .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99));
  }, [billable]);

  const expiringSoon = billingRows.filter(
    (r) => typeof r.daysLeft === "number" && r.daysLeft <= 7,
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading statistics…
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
            <h1 className="text-2xl font-bold tracking-tight">Statistics</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
              <Radio className="h-3 w-3 animate-pulse" />
              Live · DB
            </span>
            {isFetching || feeQuery.isFetching ? (
              <span className="text-xs text-muted-foreground">Updating…</span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gym-owner intake from profiles · facility fee stored in platform_settings
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
            <Link href="/dashboard/progress">
              Progress
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            Platform facility fee
          </CardTitle>
          <CardDescription>
            Set by you — no default amount. Each approved gym owner pays this for platform access.
            Saved to the database{feeStored ? " ✓" : " (empty until you save)"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="platformFee">Monthly fee per gym owner</Label>
            <Input
              id="platformFee"
              value={feeDraft}
              onChange={(e) => setFeeDraft(e.target.value)}
              placeholder="Enter fee (e.g. Rs 5000)"
              disabled={savingFee || feeQuery.isPending}
            />
          </div>
          <Button
            type="button"
            onClick={() => void saveFee()}
            disabled={savingFee || feeQuery.isPending}
          >
            {savingFee ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save to DB
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              New owners (month)
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
              <Building2 className="h-3.5 w-3.5" />
              Billable owners
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{billable.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Approved · {stats.pending} still pending
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Projected facility revenue
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {feeAmount > 0 ? formatMoney(projectedRevenue, feeLabel) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {billable.length} × {feeLabel || "fee not set"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Renewing soon
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{expiringSoon}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Facility period ends within 7 days
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              How gym owners get in
            </CardTitle>
            <CardDescription>Signups per month (from database)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {revenueBuckets.every((b) => b.joins === 0) ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No owner signups in this window yet.
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
              Facility fees by signup month
            </CardTitle>
            <CardDescription>
              Approved owners that month × your platform fee (DB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {revenueBuckets.every((b) => b.revenue === 0) ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No approved (billable) owners yet — approve gym owners to project revenue.
              </p>
            ) : (
              revenueBuckets.map((b) => (
                <div key={b.key} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs text-muted-foreground">
                    {b.label}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${(b.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="min-w-[4.5rem] text-right text-xs font-medium tabular-nums">
                    {feeAmount > 0 ? formatMoney(b.revenue, feeLabel) : b.revenue}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Facility billing — approved gym owners
          </CardTitle>
          <CardDescription>
            Each approved owner owes the monthly platform fee for CRUD / gym management
            access. Period rolls from their signup date (profiles in DB).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No approved gym owners yet. When you approve owners in Users, they show here as
              billable.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner / gym</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Period ends</TableHead>
                    <TableHead>Days left</TableHead>
                    <TableHead className="text-right">Fee due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingRows.map(({ owner, periodEnd, daysLeft }) => (
                    <TableRow key={owner.user_id}>
                      <TableCell>
                        <div className="font-medium">
                          {owner.full_name || owner.email || "Owner"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {owner.gym_name || "—"}
                          {owner.gym_city ? ` · ${owner.gym_city}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {owner.created_at
                          ? new Date(owner.created_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {periodEnd
                          ? new Date(periodEnd).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {typeof daysLeft === "number" ? (
                          <Badge
                            variant={daysLeft <= 7 ? "destructive" : "outline"}
                            className="tabular-nums"
                          >
                            {daysLeft}d
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          {feeAmount > 0 ? formatMoney(feeAmount, feeLabel) : feeLabel}
                        </span>
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
