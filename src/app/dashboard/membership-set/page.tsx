"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchMembershipFees,
  updateMembershipFee,
  type MembershipFeeAdmin,
} from "@/api/auth";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Loader2,
  MapPin,
  Search,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

function LiveTrialHint({ endsAt }: { endsAt: string }) {
  const [label, setLabel] = useState("…");

  useEffect(() => {
    const tick = () => {
      const end = new Date(endsAt).getTime();
      if (Number.isNaN(end)) {
        setLabel("—");
        return;
      }
      const ms = Math.max(0, end - Date.now());
      if (ms <= 0) {
        setLabel("Trial ended — fee applies");
        return;
      }
      const days = Math.floor(ms / 86_400_000);
      const hours = Math.floor((ms % 86_400_000) / 3_600_000);
      setLabel(
        days > 0
          ? `Trial · ${days}d ${String(hours).padStart(2, "0")}h left`
          : `Trial · ${hours}h left`,
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  return <span className="text-[11px] text-primary">{label}</span>;
}

function FeeRow({
  admin,
  onSaved,
}: {
  admin: MembershipFeeAdmin;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(admin.platform_monthly_fee || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(admin.platform_monthly_fee || "");
  }, [admin.platform_monthly_fee]);

  const dirty =
    draft.trim() !== (admin.platform_monthly_fee || "").trim();

  const save = async () => {
    setSaving(true);
    try {
      await updateMembershipFee(admin.user_id, draft.trim() || null);
      toast.success(
        draft.trim()
          ? `Fee set for ${admin.gym_name || admin.full_name || "admin"}`
          : "Fee cleared",
      );
      onSaved();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not save fee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="font-medium text-foreground">
            {admin.full_name || "Unnamed"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-0.5">
          <p className="inline-flex items-center gap-1 text-sm">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            {admin.gym_name || "—"}
          </p>
          {admin.gym_city ? (
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {admin.gym_city}
            </p>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {admin.trial_status === "active" && admin.trial_ends_at ? (
            <LiveTrialHint endsAt={admin.trial_ends_at} />
          ) : admin.trial_status === "expired" ? (
            <span className="text-[11px] text-destructive">Trial ended</span>
          ) : (
            <span className="text-[11px] text-muted-foreground">No trial</span>
          )}
          {admin.trial_ends_at ? (
            <span className="text-[10px] text-muted-foreground">
              Ends {new Date(admin.trial_ends_at).toLocaleDateString()}
            </span>
          ) : null}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. $49"
            className="h-9 w-28"
          />
          <Button
            size="sm"
            disabled={!dirty || saving}
            onClick={() => void save()}
            className="gap-1"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
        {admin.platform_monthly_fee ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            Current: {admin.platform_monthly_fee}/mo after trial
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">Not set yet</p>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function MembershipSetPage() {
  const { isSuperAdmin, isLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [feeFilter, setFeeFilter] = useState<"all" | "set" | "unset" | "trial" | "ended">("all");

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [isLoading, isSuperAdmin, router]);

  const feesQuery = useQuery({
    queryKey: queryKeys.membershipFees,
    queryFn: fetchMembershipFees,
    enabled: isSuperAdmin && !isLoading,
  });

  const admins = feesQuery.data?.admins ?? [];

  const counts = useMemo(() => {
    let set = 0;
    let unset = 0;
    let trial = 0;
    let ended = 0;
    for (const a of admins) {
      if ((a.platform_monthly_fee || "").trim()) set += 1;
      else unset += 1;
      if (a.trial_status === "active") trial += 1;
      if (a.trial_status === "expired") ended += 1;
    }
    return { set, unset, trial, ended, all: admins.length };
  }, [admins]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return admins.filter((a) => {
      const hasFee = Boolean((a.platform_monthly_fee || "").trim());
      if (feeFilter === "set" && !hasFee) return false;
      if (feeFilter === "unset" && hasFee) return false;
      if (feeFilter === "trial" && a.trial_status !== "active") return false;
      if (feeFilter === "ended" && a.trial_status !== "expired") return false;
      if (!q) return true;
      const hay = [
        a.full_name,
        a.email,
        a.gym_name,
        a.gym_city,
        a.platform_monthly_fee,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [admins, search, feeFilter]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.membershipFees });
    void queryClient.invalidateQueries({ queryKey: queryKeys.pendingAdmins });
    void queryClient.invalidateQueries({ queryKey: queryKeys.platformSettings });
  };

  if (isLoading || !isSuperAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const tabs = [
    { key: "all" as const, label: "All", count: counts.all },
    { key: "set" as const, label: "Fee set", count: counts.set },
    { key: "unset" as const, label: "Fee unset", count: counts.unset },
    { key: "trial" as const, label: "On trial", count: counts.trial },
    { key: "ended" as const, label: "Trial ended", count: counts.ended },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Membership Set</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Assign each gym owner&apos;s monthly platform fee. They see it live on
            their dashboard and pay after the free trial ends.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-primary/40 text-primary">
          {admins.length} approved owner{admins.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={feeFilter === tab.key ? "default" : "outline"}
              onClick={() => setFeeFilter(tab.key)}
            >
              {tab.label} ({tab.count})
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search owners or gyms…"
            className="pl-9"
          />
        </div>
      </div>

      {feesQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading gym owners…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          {admins.length === 0
            ? "No approved gym owners yet. Approve owners on Users first."
            : "No owners match these filters."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Gym</TableHead>
                <TableHead>Trial</TableHead>
                <TableHead>Monthly fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((admin) => (
                <FeeRow key={admin.user_id} admin={admin} onSaved={refresh} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
