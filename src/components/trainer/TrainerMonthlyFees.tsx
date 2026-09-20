"use client";

import { useQuery } from "@tanstack/react-query";
import { listTrainerClients } from "@/api/trainer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getNameInitials } from "@/lib/utils";
import {
  CheckCircle2,
  Flame,
  Loader2,
  Percent,
  Target,
  Users,
  Wallet,
} from "lucide-react";

/**
 * Trainer Monthly Fee — per-person trainer fee + your monthly from members who use you.
 */
export function TrainerMonthlyFees() {
  const clientsQuery = useQuery({
    queryKey: ["trainer-clients"],
    queryFn: listTrainerClients,
    refetchInterval: 20_000,
  });

  const payload = clientsQuery.data;
  const clients = payload?.clients ?? [];
  const stats = payload?.stats;
  const trainerPay = payload?.trainer;
  const trainerFee = payload?.trainerFee || stats?.trainerFee || null;
  const yourMonthly = stats?.projectedTrainerRevenue || null;
  const clientCount = stats?.clientCount ?? clients.length;

  if (clientsQuery.isPending && !payload) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading fees…
      </div>
    );
  }

  if (clientsQuery.error) {
    return (
      <p className="m-6 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
        {clientsQuery.error instanceof Error
          ? clientsQuery.error.message
          : "Failed to load fees"}
      </p>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Monthly Fee</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your per-person trainer price and monthly total from members who use
          you as their trainer
          {payload?.gymName ? ` at ${payload.gymName}` : ""}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Using you"
          value={String(clientCount)}
          hint={
            trainerPay?.maxClientCapacity
              ? `cap ${trainerPay.maxClientCapacity}`
              : "members"
          }
        />
        <StatCard
          icon={Target}
          label="Per person"
          value={trainerFee || "—"}
          hint="your fee"
        />
        <StatCard
          icon={Flame}
          label="Your monthly"
          value={yourMonthly || "—"}
          hint={`${clientCount} × per person`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Your monthly
            </h2>
          </div>
          <div className="space-y-2 text-sm">
            <FeeRow label="Per-person fee" value={trainerFee} />
            <FeeRow label="Members using you" value={String(clientCount)} />
            <FeeRow
              label="Your monthly total"
              value={yourMonthly}
            />
            <FeeRow label="Salary" value={trainerPay?.salary} />
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Role details
            </h2>
          </div>
          <div className="space-y-2 text-sm">
            <FeeRow label="PT sessions" value={trainerPay?.ptSessions} />
            <FeeRow label="Employment" value={trainerPay?.employmentType} />
            <FeeRow label="Working days" value={trainerPay?.workingDays} />
            <FeeRow label="Working hours" value={trainerPay?.workingHours} />
            <FeeRow label="Availability" value={trainerPay?.availability} />
            <FeeRow
              label="Specialization"
              value={trainerPay?.specialization}
            />
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Members using you
          </h2>
          <p className="text-sm text-muted-foreground">
            Members who chose you as their trainer — each adds your per-person
            fee to your monthly total.
          </p>
        </div>

        {clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No members are using you as their trainer yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-hidden rounded-2xl border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Uses trainer</th>
                    <th className="px-4 py-3 font-medium">Your fee</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr
                      key={client.userId}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            {client.avatarUrl ? (
                              <AvatarImage
                                src={client.avatarUrl}
                                alt={client.fullName}
                              />
                            ) : null}
                            <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                              {getNameInitials(client.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {client.fullName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {client.email || client.phone || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Yes — you
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium tabular-nums text-foreground">
                          {client.trainerFee || trainerFee || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {client.membershipStatus || "active"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {hint}
        </span>
      </div>
      <p className="truncate font-display text-2xl tracking-wide text-foreground sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function FeeRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-sm font-medium text-foreground">
        {value?.trim() || "—"}
      </span>
    </div>
  );
}
