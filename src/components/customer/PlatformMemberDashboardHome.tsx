"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Radio,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AdminTrialBanner } from "@/components/admin/AdminTrialBanner";
import { PlatformMemberFeeCard } from "@/components/customer/PlatformMemberFeeCard";

/**
 * Self-training platform member dashboard — same full-bleed hero pattern as gym owner.
 */
export function PlatformMemberDashboardHome() {
  const { user } = useAuth();
  const firstName = (user?.name || "there").trim().split(/\s+/)[0];
  const heroImage = user?.gymMainImageUrl || "/images/hero-gym.jpg";
  const feeAccepted = user?.platformFeeStatus === "accepted";
  const accessActive = user?.trial?.status === "active";
  const hasAccess = feeAccepted && accessActive;

  return (
    <div className="relative min-h-full -mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
      <section className="relative isolate w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImage} alt="" className="block h-[65vh] w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-background/10" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-end gap-4 px-4 py-6 sm:px-6 sm:py-8 md:flex-row md:items-end md:justify-between lg:px-8">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Platform member
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  hasAccess
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                }`}
              >
                <Radio className="h-3 w-3 animate-pulse" />
                {hasAccess ? "Access live" : "Fee pending"}
              </span>
            </div>
            <h1 className="font-display text-3xl tracking-wide text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              WELCOME,{" "}
              <span className="text-gradient">{firstName.toUpperCase()}</span>
            </h1>
            <p className="max-w-md text-sm text-muted-foreground sm:text-base">
              {hasAccess
                ? user?.trial?.endsAt
                  ? `Self-training access is active until ${new Date(user.trial.endsAt).toLocaleDateString()}. Log progress and keep training.`
                  : "Self-training access is active. Log progress and keep training."
                : feeAccepted
                  ? "Fee accepted — your 1-month access is activating."
                  : "Accept your platform monthly fee below to unlock 1 month of dashboard access."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <Link href="/dashboard/progress">
                <TrendingUp className="h-4 w-4" />
                Start exercise
              </Link>
            </Button>
            {!hasAccess ? (
              <Button asChild variant="outline" className="gap-2 border-border/80 bg-background/40 backdrop-blur-sm">
                <Link href="/gyms">
                  <Building2 className="h-4 w-4" />
                  Browse gyms
                </Link>
              </Button>
            ) : null}
            <Button
              asChild
              variant="outline"
              className="gap-2 border-border/80 bg-background/40 backdrop-blur-sm"
            >
              <Link href="/profile">
                <User className="h-4 w-4" />
                Open profile
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="relative space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <AdminTrialBanner
          trial={user?.trial}
          facilityFee={
            user?.platformMonthlyFee ? `$${user.platformMonthlyFee}` : null
          }
        />

        <PlatformMemberFeeCard enabled />

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-4">
          {[
            {
              label: "Progress",
              value: "Live",
              hint: "start exercises",
              icon: TrendingUp,
              href: "/dashboard/progress",
              locked: false,
            },
            {
              label: "Gyms",
              value: "Browse",
              hint: "find gyms",
              icon: Building2,
              href: "/gyms",
              locked: false,
            },
            {
              label: "Profile",
              value: "Ready",
              hint: "your info",
              icon: Target,
              href: "/profile",
              locked: false,
            },
            {
              label: "Access",
              value: hasAccess
                ? `${user?.trial?.daysLeft ?? "—"}d`
                : "Pending",
              hint: hasAccess ? "days left" : "accept fee",
              icon: Radio,
              href: "/dashboard",
              locked: false,
            },
          ].map((stat) =>
            stat.locked ? (
              <div
                key={stat.label}
                className="cursor-not-allowed bg-card p-5 opacity-60 sm:p-6"
                title="Accept fee to unlock"
              >
                <div className="mb-4 flex items-center justify-between">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {stat.hint}
                  </span>
                </div>
                <p className="font-display text-3xl tracking-normal text-muted-foreground sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ) : (
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
                <p className="font-display text-3xl tracking-normal text-foreground sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </Link>
            ),
          )}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="font-display text-2xl tracking-wide text-foreground sm:text-3xl">
              {hasAccess ? "WHAT'S LIVE" : "GET STARTED"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {hasAccess
                ? "Your 1-month platform access is active"
                : "Accept the platform fee to unlock training tools"}
            </p>
          </div>
          {[
            {
              title: "Start exercise & record",
              body: "Open Progress to pick an exercise, run sets, and save your session.",
              href: "/dashboard/progress",
            },
            {
              title: "Attendance — In gym / Not in gym",
              body: "Check in and mark whether you are training in a gym or elsewhere.",
              href: "/dashboard/attendance",
            },
            ...(hasAccess
              ? [
                  {
                    title: "Browse gyms",
                    body: "Explore gyms anytime — you can join one later if you want.",
                    href: "/gyms",
                  },
                ]
              : [
                  {
                    title: "Accept platform fee",
                    body: "Confirm the monthly fee above to start your 1-month access window.",
                    href: "/dashboard",
                  },
                ]),
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:bg-muted/30 sm:p-5"
            >
              <div className="min-w-0 space-y-1">
                <h3 className="font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
