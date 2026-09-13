"use client";

import { useEffect, useState } from "react";
import {
  listMonthlyMembers,
  type MonthlyMember,
} from "@/api/admin-users";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNameInitials } from "@/lib/utils";
import { Loader2 } from "lucide-react";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysTone(days: number) {
  if (days <= 3) return "bg-red-500/15 text-red-400";
  if (days <= 7) return "bg-amber-500/15 text-amber-400";
  return "bg-emerald-500/15 text-emerald-400";
}

export function MonthlyUsersTable() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MonthlyMember[]>([]);
  const [monthlyFee, setMonthlyFee] = useState<string | null>(null);
  const [gymName, setGymName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listMonthlyMembers()
      .then((data) => {
        if (cancelled) return;
        setMembers(data.members || []);
        setMonthlyFee(data.monthlyFee);
        setGymName(data.gymName);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load monthly users");
        setMembers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          Gym:{" "}
          <span className="font-medium text-foreground">{gymName || "—"}</span>
        </span>
        <span className="hidden text-zinc-700 sm:inline">|</span>
        <span className="text-muted-foreground">
          Fee:{" "}
          <span className="font-medium text-foreground">
            {monthlyFee ? `${monthlyFee}/mo` : "Not set"}
          </span>
        </span>
        <span className="hidden text-zinc-700 sm:inline">|</span>
        <span className="text-muted-foreground">
          Members:{" "}
          <span className="font-medium text-foreground">{members.length}</span>
        </span>
      </div>

      {members.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-8 text-center text-sm text-muted-foreground">
          No monthly members yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Member</th>
                <th className="w-24 px-3 py-2.5 font-medium">Fee</th>
                <th className="w-44 px-3 py-2.5 font-medium">Joined</th>
                <th className="w-44 px-3 py-2.5 font-medium">Month ends</th>
                <th className="w-28 px-3 py-2.5 text-right font-medium">Days left</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.userId}
                  className="border-b border-zinc-800/70 last:border-0 hover:bg-zinc-900/40"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        {m.avatarUrl ? (
                          <AvatarImage src={m.avatarUrl} alt={m.fullName} />
                        ) : null}
                        <AvatarFallback className="bg-zinc-800 text-[10px] font-semibold">
                          {getNameInitials(m.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 leading-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium">{m.fullName}</span>
                          <Badge
                            variant="outline"
                            className="h-4 shrink-0 border-emerald-500/25 bg-emerald-500/10 px-1 text-[9px] capitalize text-emerald-400"
                          >
                            {m.membershipStatus}
                          </Badge>
                        </div>
                        {m.email ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {m.email}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums font-medium whitespace-nowrap">
                    {m.monthlyFee ? `${m.monthlyFee}/mo` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    {formatDateTime(m.associatedAt)}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                    {formatDateTime(m.periodEnd)}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {m.daysLeft == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold tabular-nums ${daysTone(m.daysLeft)}`}
                      >
                        {m.daysLeft}d
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
