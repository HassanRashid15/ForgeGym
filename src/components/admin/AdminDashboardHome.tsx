"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminGymStats, formatMoney } from "@/hooks/useAdminGymStats";
import { usePlatformFacilityFee } from "@/hooks/usePlatformFacilityFee";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNameInitials } from "@/lib/utils";
import {
  ArrowRight,
  Building2,
  CreditCard,
  Dumbbell,
  Loader2,
  Radio,
  Shield,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

/**
 * Admin home at /dashboard — live stats from Users + Monthly Fee (DB + realtime).
 */
export function AdminDashboardHome() {
  const { user } = useAuth();
  const firstName = (user?.name || "Owner").trim().split(/\s+/)[0];
  const { stats, loading, isFetching } = useAdminGymStats(true);
  const facilityFeeQuery = usePlatformFacilityFee(true);
  const facilityFee = facilityFeeQuery.data?.platformFacilityFee || null;
  const gymHref = user?.id ? `/gyms/${user.gymOwnerId || user.id}` : "/dashboard";

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
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Gym owner
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                  <Radio className="h-3 w-3 animate-pulse" />
                  Live
                </span>
                {isFetching && !loading ? (
                  <span className="text-[10px] text-muted-foreground">Syncing…</span>
                ) : null}
              </div>
              <h1 className="font-display text-4xl tracking-wide text-foreground sm:text-5xl md:text-6xl">
                WELCOME,{" "}
                <span className="text-gradient">{firstName.toUpperCase()}</span>
              </h1>
              <p className="max-w-md text-sm text-muted-foreground sm:text-base">
                {stats.gymName || user?.gymName
                  ? `Running ${stats.gymName || user?.gymName}. Members, fees, and growth update from your database in realtime.`
                  : "Members, fees, and growth update from your database in realtime."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="gap-2">
                <Link href="/dashboard/progress">
                  <TrendingUp className="h-4 w-4" />
                  Gym progress
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/dashboard/users">
                  <Users className="h-4 w-4" />
                  Manage users
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[20vh] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading live stats…
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-4">
              {[
                {
                  label: "Members",
                  value: String(stats.members),
                  hint: `${stats.pending} pending`,
                  icon: Users,
                  href: "/dashboard/users",
                },
                {
                  label: "New month",
                  value: String(stats.newThisMonth),
                  hint: `${stats.newThisWeek} this week`,
                  icon: UserPlus,
                  href: "/dashboard/progress",
                },
                {
                  label: "Earnings",
                  value:
                    stats.feeAmount > 0
                      ? formatMoney(stats.projectedEarnings, stats.monthlyFee)
                      : "—",
                  hint: stats.monthlyFee
                    ? `${stats.billableCount} × ${stats.monthlyFee}`
                    : "set monthly fee",
                  icon: Wallet,
                  href: "/dashboard/monthly-fee",
                },
                {
                  label: "Trainers",
                  value: String(stats.trainers),
                  hint: "on roster",
                  icon: Dumbbell,
                  href: "/dashboard/trainers",
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
                  <p className="font-display text-3xl tracking-wide text-foreground sm:text-4xl">
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
                    GROWTH
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    How members joined — last 6 months from your DB
                  </p>
                </div>

                <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                  {stats.buckets.every((b) => b.count === 0) ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No joins yet. When members register and you approve them, growth
                      shows here live.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {stats.buckets.map((b) => (
                        <div key={b.key} className="flex items-center gap-3">
                          <span className="w-14 shrink-0 text-xs text-muted-foreground">
                            {b.label}
                          </span>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{
                                width: `${(b.count / stats.maxJoin) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="w-6 text-right text-xs font-medium tabular-nums">
                            {b.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button asChild variant="outline" size="sm" className="mt-5 w-full gap-2">
                    <Link href="/dashboard/progress">
                      Full progress
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      title: "Users",
                      body: "Approve members, manage roles, and grow your roster.",
                      href: "/dashboard/users",
                      badge: "Live",
                    },
                    {
                      title: "Monthly Fee",
                      body: "See billable members, fee periods, and days left.",
                      href: "/dashboard/monthly-fee",
                      badge: "Live",
                    },
                    {
                      title: "Gym Progress",
                      body: "Realtime earnings and how members are coming in.",
                      href: "/dashboard/progress",
                      badge: "Live",
                    },
                  ].map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="group flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:bg-muted/30 sm:p-5"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold tracking-tight text-foreground">
                            {item.title}
                          </h3>
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.body}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Link>
                  ))}
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
                  {(stats.gymName || user?.gymName) && (
                    <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium text-foreground">
                        {stats.gymName || user?.gymName}
                      </span>
                    </p>
                  )}
                  <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Active
                      </p>
                      <p className="text-lg font-semibold tabular-nums">{stats.active}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card/50 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Billable
                      </p>
                      <p className="text-lg font-semibold tabular-nums">
                        {stats.billableCount}
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full gap-2">
                    <Link href={gymHref}>View gym page</Link>
                  </Button>
                </section>

                <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Your gym fees
                    </h2>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Monthly fee</span>
                      <span className="font-semibold tabular-nums">
                        {stats.monthlyFee || "Not set"}
                      </span>
                    </p>
                    <p className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Trainer fee</span>
                      <span className="font-semibold tabular-nums">
                        {stats.trainerFee || "Not set"}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Set on your profile. Members with a trainer are billed monthly + trainer.
                    </p>
                  </div>
                  <p className="mt-4 font-display text-3xl tracking-wide text-foreground">
                    {stats.projectedEarnings > 0
                      ? formatMoney(stats.projectedEarnings, stats.monthlyFee)
                      : "—"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Projected this period (per-member fees from your gym settings)
                  </p>
                  <Button asChild size="sm" className="mt-4 w-full gap-2">
                    <Link href="/dashboard/monthly-fee">
                      <Wallet className="h-4 w-4" />
                      Open Monthly Fee
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="mt-2 w-full gap-2">
                    <Link href="/profile?tab=gym">Edit gym fees</Link>
                  </Button>
                </section>

                <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Platform facility fee
                    </h2>
                  </div>
                  <p className="font-display text-3xl tracking-wide text-foreground">
                    {facilityFeeQuery.isPending && !facilityFee
                      ? "…"
                      : facilityFee || "Not set"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Set by super admin only. Super admin also controls your account approval and access.
                  </p>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
