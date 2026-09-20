"use client";

import { useMemo, useState, type ComponentType } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getTrainerClientProgress,
  listTrainerClients,
} from "@/api/trainer";
import { formatDayLabel } from "@/lib/progress-catalog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getNameInitials } from "@/lib/utils";
import {
  Dumbbell,
  Flame,
  Loader2,
  Radio,
  Search,
  Target,
  Users,
} from "lucide-react";

/**
 * Trainer Progress — live list of assigned members; click opens details + exercises.
 * Fees live on /dashboard/monthly-fee.
 */
export function TrainerProgressClients() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const clientsQuery = useQuery({
    queryKey: ["trainer-clients"],
    queryFn: listTrainerClients,
    refetchInterval: 12_000,
  });

  const clients = clientsQuery.data?.clients ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.fullName, c.email, c.phone, c.fitnessGoal, c.membershipType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [clients, search]);

  const progressQuery = useQuery({
    queryKey: ["trainer-client-progress", selectedId],
    queryFn: () => getTrainerClientProgress(selectedId!, { days: 14 }),
    enabled: Boolean(selectedId),
  });

  const selected = clients.find((c) => c.userId === selectedId) || null;
  const detail = progressQuery.data;
  const trainedDays =
    detail?.days.filter(
      (d) => d.focus && d.focus.toLowerCase() !== "rest" && d.exercises.length > 0,
    ) ?? [];

  if (clientsQuery.isPending && !clientsQuery.data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading your members…
      </div>
    );
  }

  if (clientsQuery.error) {
    return (
      <p className="m-6 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
        {clientsQuery.error instanceof Error
          ? clientsQuery.error.message
          : "Failed to load members"}
      </p>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Client progress</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Radio className="h-3 w-3 animate-pulse" />
              Live
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Members assigned to you · click a card for details and exercises
          </p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">
          {clients.length} member{clients.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members…"
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {clients.length === 0
                ? "No members assigned to you yet. When members pick you as their trainer, they appear here."
                : "No members match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => (
            <button
              key={client.userId}
              type="button"
              onClick={() => setSelectedId(client.userId)}
              className="rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11 shrink-0">
                  {client.avatarUrl ? (
                    <AvatarImage src={client.avatarUrl} alt={client.fullName} />
                  ) : null}
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                    {getNameInitials(client.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {client.fullName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {client.email || client.phone || "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {client.membershipStatus ? (
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {client.membershipStatus}
                      </Badge>
                    ) : null}
                    {client.fitnessGoal ? (
                      <Badge
                        variant="outline"
                        className="max-w-full truncate border-primary/30 text-[10px] text-primary"
                      >
                        {client.fitnessGoal}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Sheet
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {detail?.member.fullName || selected?.fullName || "Member"}
            </SheetTitle>
            <SheetDescription>
              Profile and workout exercises from the last 14 days
            </SheetDescription>
          </SheetHeader>

          {progressQuery.isPending ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading progress…
            </div>
          ) : progressQuery.error ? (
            <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
              {progressQuery.error instanceof Error
                ? progressQuery.error.message
                : "Could not load progress"}
            </p>
          ) : detail ? (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  {detail.member.avatarUrl ? (
                    <AvatarImage
                      src={detail.member.avatarUrl}
                      alt={detail.member.fullName}
                    />
                  ) : null}
                  <AvatarFallback className="bg-primary/15 font-semibold text-primary">
                    {getNameInitials(detail.member.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold">{detail.member.fullName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {detail.member.email || "—"}
                  </p>
                  {detail.member.phone ? (
                    <p className="text-xs text-muted-foreground">{detail.member.phone}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <InfoCell label="Goal" value={detail.member.fitnessGoal} />
                <InfoCell label="Plan" value={detail.member.membershipType} />
                <InfoCell label="Experience" value={detail.member.experienceLevel} />
                <InfoCell
                  label="Joined"
                  value={
                    detail.member.joinDate
                      ? new Date(detail.member.joinDate).toLocaleDateString()
                      : null
                  }
                />
                <InfoCell
                  label="BMI"
                  value={
                    detail.member.bmi != null ? String(detail.member.bmi) : null
                  }
                />
                <InfoCell
                  label="Weight"
                  value={
                    detail.member.weightKg != null
                      ? `${detail.member.weightKg} kg`
                      : null
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatPill
                  icon={Flame}
                  label="Trained"
                  value={String(detail.stats.trainedDays)}
                />
                <StatPill
                  icon={Dumbbell}
                  label="Exercises"
                  value={String(detail.stats.totalExercises)}
                />
                <StatPill
                  icon={Target}
                  label="Sets"
                  value={String(detail.stats.totalSets)}
                />
                <StatPill
                  icon={Flame}
                  label="Streak"
                  value={String(detail.stats.streak)}
                />
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Exercises they do
                </h3>
                {detail.topExercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No exercises logged in this period yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {detail.topExercises.map((ex) => (
                      <Badge
                        key={ex.name}
                        variant="outline"
                        className="border-primary/30 px-2.5 py-1 text-xs"
                      >
                        <Dumbbell className="mr-1 h-3 w-3 text-primary" />
                        {ex.name}
                        <span className="ml-1 text-muted-foreground">×{ex.count}</span>
                      </Badge>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Recent workouts
                </h3>
                {trainedDays.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No workout days with exercises in the last 14 days.
                  </p>
                ) : (
                  trainedDays
                    .slice()
                    .reverse()
                    .map((day) => (
                      <Card key={day.date} className="border-border/70 shadow-none">
                        <CardHeader className="pb-2 pt-4">
                          <CardTitle className="text-sm">
                            {formatDayLabel(day.date)}
                            {day.focus ? (
                              <span className="ml-2 font-normal text-muted-foreground">
                                · {day.focus}
                              </span>
                            ) : null}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {[
                              day.duration_minutes
                                ? `${day.duration_minutes} min`
                                : null,
                              day.calories ? `${day.calories} kcal` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "Session logged"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-4">
                          {day.exercises.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              Focus set, no exercises yet.
                            </p>
                          ) : (
                            <ul className="space-y-1.5">
                              {day.exercises.map((ex) => (
                                <li
                                  key={ex.id}
                                  className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5 text-sm"
                                >
                                  <span className="min-w-0 truncate font-medium">
                                    {ex.exercise_name}
                                  </span>
                                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                    {ex.sets}×{ex.reps}
                                    {ex.weight ? ` · ${ex.weight}` : ""}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </CardContent>
                      </Card>
                    ))
                )}
              </section>

              {detail.personalRecords.length > 0 ? (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Personal records</h3>
                  <ul className="space-y-1.5">
                    {detail.personalRecords.slice(0, 8).map((pr) => (
                      <li
                        key={pr.id}
                        className="flex justify-between gap-2 text-sm"
                      >
                        <span className="truncate">{pr.exercise_name}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {pr.value}
                          {pr.unit ? ` ${pr.unit}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setSelectedId(null)}
              >
                Close
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium capitalize">
        {value || "—"}
      </p>
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-center">
      <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-primary" />
      <p className="truncate text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
