"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  Activity,
  Globe,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { ApiError } from "@/api/client";
import { listAdminTraffic, type PublicTrafficVisit } from "@/api/traffic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

type Props = {
  initialVisits: PublicTrafficVisit[];
  initialTotal: number;
  initialToday: number;
  initialUniqueIps: number;
};

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function uniqueIpCount(rows: PublicTrafficVisit[]) {
  return new Set(rows.map((v) => v.ip_address)).size;
}

export function PublicTrafficClient({
  initialVisits,
  initialTotal,
  initialToday,
  initialUniqueIps,
}: Props) {
  const router = useRouter();
  const [visits, setVisits] = useState(initialVisits);
  const [total, setTotal] = useState(initialTotal);
  const [today, setToday] = useState(initialToday);
  const [uniqueIps, setUniqueIps] = useState(initialUniqueIps);
  const [search, setSearch] = useState("");
  const [live, setLive] = useState(false);
  const [pending, startTransition] = useTransition();

  // Keep in sync if SSR revalidates
  useEffect(() => {
    setVisits(initialVisits);
    setTotal(initialTotal);
    setToday(initialToday);
    setUniqueIps(initialUniqueIps);
  }, [initialVisits, initialTotal, initialToday, initialUniqueIps]);

  const applySnapshot = useCallback(
    (data: {
      visits: PublicTrafficVisit[];
      total: number;
      today: number;
      uniqueIps: number;
    }) => {
      setVisits(data.visits || []);
      setTotal(data.total || 0);
      setToday(data.today || 0);
      setUniqueIps(data.uniqueIps || 0);
    },
    [],
  );

  const refresh = useCallback(
    async (silent = false) => {
      try {
        const data = await listAdminTraffic(250);
        if (data.success) {
          applySnapshot(data);
          if (!silent) router.refresh();
        } else if (!silent) {
          toast.error(data.error || "Failed to load traffic");
        }
      } catch (error) {
        if (!silent) {
          toast.error(
            error instanceof ApiError ? error.message : "Failed to load traffic",
          );
        }
      }
    },
    [applySnapshot, router],
  );

  // Instant row insert from Realtime + poll fallback
  useEffect(() => {
    const channel = supabase
      .channel(`public-traffic-live:${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "public_traffic" },
        (payload) => {
          setLive(true);
          const row = payload.new as PublicTrafficVisit | null;
          if (!row?.id) {
            void refresh(true);
            return;
          }
          setVisits((prev) => {
            if (prev.some((v) => v.id === row.id)) return prev;
            const next = [row, ...prev].slice(0, 250);
            setUniqueIps(uniqueIpCount(next));
            return next;
          });
          setTotal((t) => t + 1);
          if (row.visited_at && isToday(row.visited_at)) {
            setToday((t) => t + 1);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLive(true);
      });

    const poll = window.setInterval(() => {
      void refresh(true);
    }, 8_000);

    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visits;
    return visits.filter(
      (v) =>
        v.ip_address.toLowerCase().includes(q) ||
        v.path.toLowerCase().includes(q) ||
        (v.referrer || "").toLowerCase().includes(q) ||
        (v.user_agent || "").toLowerCase().includes(q),
    );
  }, [visits, search]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Public Traffic</h1>
            <Badge
              variant="outline"
              className={
                live
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-600 text-zinc-400"
              }
            >
              {live ? "Live" : "Connecting…"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Approaches load on the server instantly, then stay live as new
            visitors hit the public site.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            startTransition(() => {
              void refresh(false);
            })
          }
          disabled={pending}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/60 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Total approaches
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Today
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{today}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/60 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Unique IPs (page)
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{uniqueIps}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/50">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Approaches</CardTitle>
            <CardDescription>
              Showing {filtered.length} of {visits.length} loaded rows
            </CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search IP, path, referrer…"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">When</th>
                <th className="pb-3 pr-4 font-medium">IP</th>
                <th className="pb-3 pr-4 font-medium">Path</th>
                <th className="pb-3 pr-4 font-medium">Referrer</th>
                <th className="pb-3 font-medium">Device</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No public approaches yet. Open the site home in another tab
                    to generate a hit.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                      {format(new Date(v.visited_at), "MMM d, HH:mm:ss")}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{v.ip_address}</td>
                    <td className="py-3 pr-4 font-medium">{v.path}</td>
                    <td className="max-w-[180px] truncate py-3 pr-4 text-muted-foreground">
                      {v.referrer || "—"}
                    </td>
                    <td className="max-w-[220px] truncate py-3 text-xs text-muted-foreground">
                      {v.user_agent || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
