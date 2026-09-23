"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMonthlyMembers,
  updateManagedUser,
  type MonthlyMember,
} from "@/api/admin-users";
import { getGymTrainers } from "@/api/gyms";
import { ApiError } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNameInitials } from "@/lib/utils";
import { Loader2, Search } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/contexts/AuthContext";
import { formatMemberFee } from "@/lib/fees";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type GymTrainerOption = {
  userId: string;
  fullName: string | null;
  specialization: string | null;
};

type MemberFilter = "all" | "trainer" | "no_trainer" | "concession" | "soon";

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
  return "bg-primary/15 text-primary";
}

export function MonthlyUsersTable() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const gymOwnerId = user?.gymOwnerId || user?.id || null;
  const [savingId, setSavingId] = useState<string | null>(null);
  const [concessionDraft, setConcessionDraft] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");

  const { data, isPending, error, isFetching } = useQuery({
    queryKey: queryKeys.monthlyMembers,
    queryFn: listMonthlyMembers,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
  });

  const trainersQuery = useQuery({
    queryKey: ["gym-trainers", gymOwnerId],
    enabled: Boolean(gymOwnerId),
    queryFn: async (): Promise<GymTrainerOption[]> => {
      try {
        const json = await getGymTrainers(gymOwnerId!);
        return Array.isArray(json?.trainers)
          ? (json.trainers as GymTrainerOption[])
          : [];
      } catch (err) {
        throw new Error(
          err instanceof ApiError ? err.message : "Failed to load trainers",
        );
      }
    },
  });

  const trainers = trainersQuery.data || [];

  const adjustMutation = useMutation({
    mutationFn: async ({
      userId,
      preferredTrainerId,
      feeConcession,
    }: {
      userId: string;
      preferredTrainerId?: string;
      feeConcession?: string | null;
    }) =>
      updateManagedUser({
        userId,
        ...(preferredTrainerId !== undefined
          ? { preferred_trainer_id: preferredTrainerId || null }
          : {}),
        ...(feeConcession !== undefined
          ? { fee_concession: feeConcession || null }
          : {}),
      }),
    onMutate: async ({ userId, preferredTrainerId, feeConcession }) => {
      setSavingId(userId);
      await queryClient.cancelQueries({ queryKey: queryKeys.monthlyMembers });
      const previous = queryClient.getQueryData<{
        monthlyFee: string | null;
        trainerFee: string | null;
        gymName: string | null;
        members: MonthlyMember[];
      }>(queryKeys.monthlyMembers);

      if (previous) {
        queryClient.setQueryData(queryKeys.monthlyMembers, {
          ...previous,
          members: previous.members.map((m) => {
            if (m.userId !== userId) return m;
            const nextTrainerId =
              preferredTrainerId !== undefined
                ? preferredTrainerId || null
                : m.preferredTrainerId;
            const hasTrainer = Boolean(nextTrainerId);
            const nextConcession =
              feeConcession !== undefined
                ? feeConcession || null
                : m.feeConcession || null;
            const fee = formatMemberFee(
              previous.monthlyFee,
              previous.trainerFee,
              hasTrainer,
              nextConcession,
            );
            return {
              ...m,
              preferredTrainerId: nextTrainerId,
              hasTrainer,
              feeConcession: nextConcession,
              monthlyFee: fee,
            };
          }),
        });
      }

      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKeys.monthlyMembers, ctx.previous);
      }
      toast.error(err instanceof Error ? err.message : "Could not update fee");
    },
    onSuccess: (_data, vars) => {
      if (vars.feeConcession !== undefined) {
        toast.success(
          vars.feeConcession
            ? "Concession saved — member fee updated live."
            : "Concession cleared — standard fee restored.",
        );
      } else {
        toast.success(
          vars.preferredTrainerId
            ? "Trainer assigned — fee updated. Member notified."
            : "Trainer removed — fee updated. Member notified.",
        );
      }
    },
    onSettled: () => {
      setSavingId(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.monthlyMembers });
    },
  });

  const members = data?.members || [];
  const monthlyFee = data?.monthlyFee ?? null;
  const trainerFee = data?.trainerFee ?? null;
  const gymName = data?.gymName ?? null;
  const loading = isPending && !data;

  const trainerLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of trainers) {
      map.set(
        t.userId,
        `${t.fullName || "Trainer"}${t.specialization ? ` · ${t.specialization}` : ""}`,
      );
    }
    return map;
  }, [trainers]);

  const counts = useMemo(() => {
    let trainer = 0;
    let noTrainer = 0;
    let concession = 0;
    let soon = 0;
    for (const m of members) {
      if (m.hasTrainer) trainer += 1;
      else noTrainer += 1;
      if (m.feeConcession) concession += 1;
      if (typeof m.daysLeft === "number" && m.daysLeft <= 7) soon += 1;
    }
    return {
      all: members.length,
      trainer,
      noTrainer,
      concession,
      soon,
    };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (memberFilter === "trainer" && !m.hasTrainer) return false;
      if (memberFilter === "no_trainer" && m.hasTrainer) return false;
      if (memberFilter === "concession" && !m.feeConcession) return false;
      if (
        memberFilter === "soon" &&
        !(typeof m.daysLeft === "number" && m.daysLeft <= 7)
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [m.fullName, m.email, m.monthlyFee, m.feeConcession]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [members, search, memberFilter]);

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
        {error instanceof Error ? error.message : "Failed to load monthly users"}
      </p>
    );
  }

  const tabs: { key: MemberFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "trainer", label: "With trainer", count: counts.trainer },
    { key: "no_trainer", label: "Gym only", count: counts.noTrainer },
    { key: "concession", label: "Concession", count: counts.concession },
    { key: "soon", label: "Ending soon", count: counts.soon },
  ];

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
          {trainerFee ? (
            <span className="text-muted-foreground">
              {" "}
              · trainer +{trainerFee}
            </span>
          ) : null}
        </span>
        <span className="hidden text-zinc-700 sm:inline">|</span>
        <span className="text-muted-foreground">
          Members:{" "}
          <span className="font-medium text-foreground">{members.length}</span>
        </span>
        {isFetching && data ? (
          <span className="ml-auto text-xs text-muted-foreground">Live…</span>
        ) : null}
      </div>

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

      {members.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-8 text-center text-sm text-muted-foreground">
          No monthly members yet.
        </p>
      ) : filteredMembers.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 px-3 py-8 text-center text-sm text-muted-foreground">
          No members match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-left text-xs text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Member</th>
                <th className="w-28 px-3 py-2.5 font-medium">Fee</th>
                <th className="min-w-[160px] px-3 py-2.5 font-medium">Concession</th>
                <th className="min-w-[200px] px-3 py-2.5 font-medium">Adjust trainer</th>
                <th className="w-40 px-3 py-2.5 font-medium">Joined</th>
                <th className="w-40 px-3 py-2.5 font-medium">Month ends</th>
                <th className="w-24 px-3 py-2.5 text-right font-medium">Days left</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => {
                const busy = savingId === m.userId;
                return (
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
                              className="h-4 shrink-0 border-primary/25 bg-primary/10 px-1 text-[9px] capitalize text-primary"
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
                      <div className="leading-tight">
                        <span>{m.monthlyFee ? `${m.monthlyFee}/mo` : "—"}</span>
                        {m.feeConcession ? (
                          <p className="text-[10px] font-normal text-primary">
                            concession
                          </p>
                        ) : m.hasTrainer ? (
                          <p className="text-[10px] font-normal text-muted-foreground">
                            + trainer
                            {m.preferredTrainerId
                              ? ` · ${
                                  trainerLabelById
                                    .get(m.preferredTrainerId)
                                    ?.split(" · ")[0] || "assigned"
                                }`
                              : ""}
                          </p>
                        ) : (
                          <p className="text-[10px] font-normal text-muted-foreground">
                            gym only
                          </p>
                        )}
                        {m.trainerRequestPending ? (
                          <p className="text-[10px] font-normal text-amber-400">
                            trainer pending
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Input
                          className="h-9 max-w-[120px] text-xs"
                          placeholder="e.g. 3000"
                          value={
                            concessionDraft[m.userId] ?? m.feeConcession ?? ""
                          }
                          disabled={busy}
                          onChange={(e) =>
                            setConcessionDraft((prev) => ({
                              ...prev,
                              [m.userId]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 shrink-0 px-2 text-xs"
                          disabled={busy}
                          onClick={() => {
                            const next =
                              concessionDraft[m.userId] ?? m.feeConcession ?? "";
                            adjustMutation.mutate({
                              userId: m.userId,
                              feeConcession: next.trim() || null,
                            });
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <select
                          className="h-9 w-full max-w-[220px] rounded-md border border-input bg-background px-2 text-xs disabled:opacity-60"
                          value={m.preferredTrainerId || ""}
                          disabled={busy || trainers.length === 0}
                          onChange={(e) => {
                            adjustMutation.mutate({
                              userId: m.userId,
                              preferredTrainerId: e.target.value,
                            });
                          }}
                        >
                          <option value="">
                            {trainers.length === 0
                              ? "No trainers"
                              : "No trainer"}
                          </option>
                          {trainers.map((t) => (
                            <option key={t.userId} value={t.userId}>
                              {t.fullName || "Trainer"}
                              {t.specialization ? ` · ${t.specialization}` : ""}
                            </option>
                          ))}
                        </select>
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                        ) : null}
                      </div>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
