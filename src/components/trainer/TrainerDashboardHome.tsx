"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { listTrainerClients } from "@/api/trainer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNameInitials } from "@/lib/utils";
import {
  ArrowRight,
  Building2,
  Calendar,
  Dumbbell,
  Loader2,
  Users,
  Wallet,
  Target,
} from "lucide-react";

/**
 * Trainer home at /dashboard — live clients; fees live on Monthly Fee page.
 */
export function TrainerDashboardHome() {
  const { user } = useAuth();
  const firstName = (user?.name || "Trainer").trim().split(/\s+/)[0];
  const gymHref = user?.gymOwnerId ? `/gyms/${user.gymOwnerId}` : "/dashboard";

  const clientsQuery = useQuery({
    queryKey: ["trainer-clients"],
    queryFn: listTrainerClients,
    refetchInterval: 30_000,
  });

  const payload = clientsQuery.data;
  const clients = payload?.clients ?? [];
  const stats = payload?.stats;
  const trainerPay = payload?.trainer;

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
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage: `url('${user?.gymMainImageUrl || "/images/hero-gym.jpg"}')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/95 to-card/40" />
          <div className="relative flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Trainer dashboard
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
              <h1 className="font-display text-4xl tracking-wide text-foreground sm:text-5xl md:text-6xl">
                WELCOME,{" "}
                <span className="text-gradient">{firstName.toUpperCase()}</span>
              </h1>
              <p className="max-w-md text-sm text-muted-foreground sm:text-base">
                {user?.gymName || payload?.gymName
                  ? `Training at ${user?.gymName || payload?.gymName}. Manage your clients, track sessions, and help them reach their fitness goals.`
                  : "Manage your clients, track sessions, and help them reach their fitness goals."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="gap-2">
                <Link href="/dashboard/progress">
                  <Users className="h-4 w-4" />
                  My clients
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/dashboard/monthly-fee">
                  <Wallet className="h-4 w-4" />
                  Monthly Fee
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3">
          {[
            {
              label: "Active clients",
              value: clientsQuery.isPending
                ? "…"
                : String(stats?.clientCount ?? clients.length),
              hint: trainerPay?.maxClientCapacity
                ? `cap ${trainerPay.maxClientCapacity}`
                : "assigned",
              icon: Users,
              href: "/dashboard/progress",
            },
            {
              label: "Client progress",
              value: "Open",
              hint: "workouts",
              icon: Target,
              href: "/dashboard/progress",
            },
            {
              label: "Monthly Fee",
              value: "Open",
              hint: "fees & pay",
              icon: Wallet,
              href: "/dashboard/monthly-fee",
            },
          ].map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-card p-5 transition-colors hover:bg-muted/40 sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <stat.icon className="h-4 w-4 text-primary" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {stat.hint}
                </span>
              </div>
              <p className="truncate font-display text-2xl tracking-wide text-foreground sm:text-3xl md:text-4xl">
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
                YOUR CLIENTS
              </h2>
              <p className="text-sm text-muted-foreground">
                Assigned members — fees are on Monthly Fee in the sidebar
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              {clientsQuery.isPending ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading clients…
                </div>
              ) : clientsQuery.error ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
                  {clientsQuery.error instanceof Error
                    ? clientsQuery.error.message
                    : "Failed to load clients"}
                </p>
              ) : clients.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No members assigned to you yet. When members pick you as their
                  trainer, they appear here.
                </p>
              ) : (
                <div className="space-y-3">
                  {clients.slice(0, 6).map((client) => (
                    <Link
                      key={client.userId}
                      href="/dashboard/progress"
                      className="group flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:bg-muted/30"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          {client.avatarUrl ? (
                            <AvatarImage
                              src={client.avatarUrl}
                              alt={client.fullName}
                            />
                          ) : null}
                          <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                            {getNameInitials(client.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate font-semibold tracking-tight text-foreground">
                              {client.fullName}
                            </h3>
                            {client.fitnessGoal ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                {client.fitnessGoal}
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {client.email || client.phone || "—"}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  ))}
                </div>
              )}
              <Button
                asChild
                variant="outline"
                size="sm"
                className="mt-5 w-full gap-2"
              >
                <Link href="/dashboard/progress">
                  View client progress
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
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
              {(user?.gymName || payload?.gymName) && (
                <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-foreground">
                    {user?.gymName || payload?.gymName}
                  </span>
                </p>
              )}
              <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Specialization
                  </p>
                  <p className="truncate text-sm font-semibold">
                    {trainerPay?.specialization || "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Experience
                  </p>
                  <p className="truncate text-sm font-semibold">
                    {trainerPay?.yearsExperience || "—"}
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full gap-2">
                <Link href="/profile">Edit profile</Link>
              </Button>
            </section>

            <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick actions
                </h2>
              </div>
              <div className="space-y-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <Link href="/dashboard/progress">
                    <Users className="h-4 w-4" />
                    View clients
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <Link href="/dashboard/monthly-fee">
                    <Wallet className="h-4 w-4" />
                    Monthly Fee
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                >
                  <Link href="/profile">
                    <Calendar className="h-4 w-4" />
                    Profile settings
                  </Link>
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
