"use client";

import { Users, Dumbbell, CalendarDays, Building2, type LucideIcon } from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { AnimatedCounter } from "@/components/marketing/AnimatedCounter";
import type { PlatformPublicStats } from "@/lib/platform-stats";

type StatItem = {
  value: number;
  suffix: string;
  format?: (n: number) => string;
  label: string;
  detail: string;
  icon: LucideIcon;
};

function buildStats(stats: PlatformPublicStats): StatItem[] {
  const members = stats.memberCount;
  const trainers = stats.trainerCount;
  const classes = stats.classCount;
  const gyms = stats.gymCount;

  return [
    {
      value: members,
      suffix: members >= 1000 ? "+" : "",
      format:
        members >= 1000
          ? (n) => `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K`
          : undefined,
      label: "Active Members",
      detail: "Training across the network",
      icon: Users,
    },
    {
      value: trainers,
      suffix: trainers > 0 ? "+" : "",
      label: "Expert Trainers",
      detail: "Certified coaches on the floor",
      icon: Dumbbell,
    },
    {
      value: classes,
      suffix: classes > 0 ? "+" : "",
      label: "Active Classes",
      detail: "Live programs this week",
      icon: CalendarDays,
    },
    {
      value: gyms,
      suffix: "",
      label: gyms === 1 ? "Partner Gym" : "Partner Gyms",
      detail:
        stats.maxYearsOperating > 0
          ? `Up to ${stats.maxYearsOperating}+ years operating`
          : "Growing the Forge network",
      icon: Building2,
    },
  ];
}

const emptyStats: PlatformPublicStats = {
  memberCount: 0,
  trainerCount: 0,
  classCount: 0,
  gymCount: 0,
  maxYearsOperating: 0,
  memberCountsByOwner: {},
};

export function HomeStatsSection({
  stats = emptyStats,
}: {
  stats?: PlatformPublicStats;
}) {
  const items = buildStats(stats);

  return (
    <section className="relative overflow-hidden border-y border-border bg-card py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_55%)]"
      />

      <div className="container relative mx-auto px-4">
        <ScrollAnimate animation="fade-up" className="mb-12 max-w-xl md:mb-16">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
            Forge by the numbers
          </p>
          <h2 className="font-display text-4xl tracking-normal text-foreground md:text-5xl">
            Built for real results
          </h2>
        </ScrollAnimate>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {items.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <ScrollAnimate
                key={stat.label}
                animation="fade-up"
                delay={index * 0.08}
                className="group relative bg-background px-6 py-8 md:px-8 md:py-10"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-primary/5 text-primary transition duration-300 group-hover:border-primary/40 group-hover:bg-primary/10">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="font-display text-xs tracking-wide text-muted-foreground/50">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="mb-2 font-display text-5xl tracking-normal text-foreground md:text-6xl">
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    format={stat.format}
                    durationMs={1400 + index * 120}
                  />
                </div>

                <p className="text-sm font-semibold text-foreground">{stat.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>

                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-primary to-transparent transition duration-500 group-hover:scale-x-100"
                />
              </ScrollAnimate>
            );
          })}
        </div>
      </div>
    </section>
  );
}
