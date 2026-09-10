"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { getNameInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dumbbell,
  Flame,
  Calendar,
  CreditCard,
  ArrowRight,
  Clock,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

const weekStats = [
  { label: "Sessions", value: "12", hint: "this week", icon: Dumbbell },
  { label: "Calories", value: "2.4k", hint: "burned", icon: Flame },
  { label: "Classes", value: "8", hint: "attended", icon: Calendar },
  { label: "Streak", value: "5", hint: "days", icon: Zap },
];

const upcoming = [
  {
    name: "Power HIIT",
    when: "Today · 5:00 PM",
    room: "Studio A",
    intensity: "High",
    href: "/classes/power-hiit",
    image: "/images/class-hiit.jpg",
  },
  {
    name: "Flow Yoga",
    when: "Tomorrow · 7:00 AM",
    room: "Studio B",
    intensity: "Low",
    href: "/classes/power-yoga",
    image: "/images/class-yoga.jpg",
  },
  {
    name: "Spin Surge",
    when: "Wed · 6:00 PM",
    room: "Cycle Room",
    intensity: "High",
    href: "/classes/spin-revolution",
    image: "/images/class-spin.jpg",
  },
];

const activity = [
  { title: "Chest & Triceps session", time: "2 hours ago", meta: "48 min · PR on bench" },
  { title: "Booked Spin Surge", time: "Yesterday", meta: "Wed 6:00 PM" },
  { title: "Weekly goal hit", time: "2 days ago", meta: "8 / 8 workouts" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = (user?.name || "Athlete").trim().split(/\s+/)[0];

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
            style={{ backgroundImage: "url('/images/hero-gym.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/95 to-card/40" />
          <div className="relative flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-end md:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Member hub
              </p>
              <h1 className="font-display text-4xl tracking-wide text-foreground sm:text-5xl md:text-6xl">
                LET&apos;S GO,{" "}
                <span className="text-gradient">{firstName.toUpperCase()}</span>
              </h1>
              <p className="max-w-md text-sm text-muted-foreground sm:text-base">
                Your week is stacking up. Stay consistent — the next session is already waiting.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="gap-2">
                <Link href="/dashboard/schedule">
                  <Calendar className="h-4 w-4" />
                  View schedule
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/dashboard/classes">
                  Browse classes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-4">
          {weekStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card p-5 transition-colors hover:bg-muted/40 sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <stat.icon className="h-4 w-4 text-primary" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {stat.hint}
                </span>
              </div>
              <p className="font-display text-4xl tracking-wide text-foreground sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl tracking-wide text-foreground sm:text-3xl">
                  UP NEXT
                </h2>
                <p className="text-sm text-muted-foreground">Classes on your calendar</p>
              </div>
              <Link
                href="/dashboard/schedule"
                className="text-sm font-medium text-primary hover:underline"
              >
                Full schedule
              </Link>
            </div>

            <div className="space-y-3">
              {upcoming.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group flex overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:border-primary/40 hover:bg-muted/30"
                >
                  <div
                    className="relative hidden w-28 shrink-0 bg-cover bg-center sm:block"
                    style={{ backgroundImage: `url('${item.image}')` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card" />
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-4 p-4 sm:p-5">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold tracking-tight text-foreground">
                          {item.name}
                        </h3>
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {item.intensity}
                        </span>
                      </div>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {item.when}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.room}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
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
                  <p className="truncate font-semibold text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
                <span className="rounded-full border border-primary/30 px-2.5 py-1 text-xs font-medium text-primary">
                  Basic plan
                </span>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full gap-2">
                <Link href="/dashboard/membership">
                  <CreditCard className="h-4 w-4" />
                  Manage membership
                </Link>
              </Button>
            </section>

            <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Weekly goal
                </h2>
              </div>
              <p className="font-display text-3xl tracking-wide text-foreground">8 / 8</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-primary to-accent" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Goal complete — keep the streak alive.
              </p>
            </section>

            <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent
                  </h2>
                </div>
                <Link href="/dashboard/progress" className="text-xs text-primary hover:underline">
                  Progress
                </Link>
              </div>
              <ul className="space-y-4">
                {activity.map((item) => (
                  <li
                    key={item.title}
                    className="border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.time} · {item.meta}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
