"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminDashboardHome } from "@/components/admin/AdminDashboardHome";
import { AdminWelcomeModal } from "@/components/admin/AdminWelcomeModal";
import { SuperAdminDashboardHome } from "@/components/admin/SuperAdminDashboardHome";
import { TrainerDashboardHome } from "@/components/trainer/TrainerDashboardHome";
import { DashboardSkeleton } from "@/components/loading/DashboardSkeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getNameInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  CreditCard,
  ArrowRight,
  Target,
  TrendingUp,
  Building2,
  MapPin,
  ExternalLink,
  Wallet,
  Clock,
} from "lucide-react";
import { MemberBillingCard } from "@/components/customer/MemberBillingCard";
import { CheckInButton } from "@/components/customer/CheckInButton";
import { VisitorCountdown } from "@/components/customer/VisitorCountdown";

interface AdminDashboardClientProps {
  initialWelcomeData: {
    checked: boolean;
    showModal: boolean;
    gymName?: string;
    userName?: string;
  };
}

export function AdminDashboardClient({ initialWelcomeData }: AdminDashboardClientProps) {
  const { user, isAdmin, isSuperAdmin, isTrainer, isVisitor, isLoading } = useAuth();
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  const effectiveWelcome = {
    ...initialWelcomeData,
    showModal: initialWelcomeData.showModal && !welcomeDismissed,
  };

  // Show welcome modal over skeleton immediately from SSR — don't wait for AuthContext
  if (isLoading) {
    return (
      <>
        {effectiveWelcome.showModal ? (
          <AdminWelcomeModal
            isOpen
            onClose={() => setWelcomeDismissed(true)}
            gymName={effectiveWelcome.gymName}
            userName={effectiveWelcome.userName}
          />
        ) : null}
        <DashboardSkeleton />
      </>
    );
  }

  if (isSuperAdmin) {
    return <SuperAdminDashboardHome />;
  }

  if (isAdmin) {
    return <AdminDashboardHome initialWelcomeData={effectiveWelcome} />;
  }

  if (isTrainer) {
    return <TrainerDashboardHome />;
  }

  // Customer dashboard (fallback)
  const firstName = (user?.name || "Athlete").trim().split(/\s+/)[0];
  const isCustomer = user?.role === "customer" || user?.role === "user";
  const hasGym = Boolean(user?.gymOwnerId && user?.gymName);
  const isApprovedMember = isCustomer && hasGym && user?.membershipStatus === "active" && !isVisitor;
  const membershipLabel = (user?.membershipStatus || "active").replace(/_/g, " ");
  const planLabel = user?.membershipType || "Basic";
  const gymHref = user?.gymOwnerId ? `/gyms/${user.gymOwnerId}` : null;

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
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {isApprovedMember ? "Member hub" : "Welcome"}
              </p>
              <h1 className="font-display text-4xl tracking-wide text-foreground sm:text-5xl md:text-6xl">
                {isApprovedMember ? (
                  <>
                    LET&apos;S GO,{" "}
                    <span className="text-gradient">{firstName.toUpperCase()}</span>
                  </>
                ) : (
                  <>
                    WELCOME,{" "}
                    <span className="text-gradient">{firstName.toUpperCase()}</span>
                  </>
                )}
              </h1>
              <p className="max-w-md text-sm text-muted-foreground sm:text-base">
                {isApprovedMember
                  ? `Training with ${user?.gymName}${user?.gymCity ? ` in ${user.gymCity}` : ""}. Stay consistent — your next session is waiting.`
                  : hasGym
                    ? "Your membership is pending approval. Join your gym to access member features."
                    : "Join a gym to start your fitness journey. Browse gyms and become a member today."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isApprovedMember && <CheckInButton />}
              {isApprovedMember ? (
                <Button asChild className="gap-2">
                  <Link href="/dashboard/progress">
                    <TrendingUp className="h-4 w-4" />
                    Log progress
                  </Link>
                </Button>
              ) : (
                <Button asChild className="gap-2">
                  <Link href="/gyms">
                    <Building2 className="h-4 w-4" />
                    Browse gyms
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="gap-2">
                <Link href="/profile">
                  Open profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {isApprovedMember && (
          <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="grid md:grid-cols-[minmax(0,280px)_1fr]">
              <div className="relative min-h-[160px] bg-muted/40 md:min-h-full">
                {user?.gymMainImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.gymMainImageUrl}
                    alt={user?.gymName || "Gym"}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-[160px] items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-card">
                    <Building2 className="h-12 w-12 text-primary/70" />
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    Your gym
                  </p>
                  <h2 className="font-display text-3xl tracking-wide text-foreground sm:text-4xl">
                    {user?.gymName}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {user?.gymCity && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {user.gymCity}
                      </span>
                    )}
                    {user?.gymType && (
                      <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                        {user.gymType}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold capitalize text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {membershipLabel}
                    </span>
                    <span className="rounded-full border border-primary/30 px-2.5 py-0.5 text-xs font-medium capitalize text-primary">
                      {planLabel} plan
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {gymHref && (
                    <Button asChild className="gap-2">
                      <Link href={gymHref}>
                        View gym page
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="gap-2">
                    <Link href="/profile?tab=membership">
                      <CreditCard className="h-4 w-4" />
                      Gym association
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {isApprovedMember && <MemberBillingCard />}

        {!isApprovedMember && (
          <>
            <VisitorCountdown />
            <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-2xl tracking-wide text-foreground">Join a Gym</h2>
                  <p className="text-sm text-muted-foreground">Become a member to unlock all features</p>
                </div>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                Browse gyms in your area, view their facilities, and request membership. Once approved, you'll have access to check-ins, progress tracking, and more.
              </p>
              <Button asChild className="gap-2">
                <Link href="/gyms">
                  Browse gyms
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </section>
            <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Monthly fee
                </h2>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-display text-3xl text-foreground">
                    {user?.gymName ? "Contact gym" : "Fee not set"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {user?.gymName || "Your gym"}
                    {" · "}
                    Data fee will be charged if you become member
                  </p>
                  {user?.gymName && (
                    <p className="text-xs text-muted-foreground">
                      Contact {user.gymName} for fee details
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Clock className="h-3.5 w-3.5" />
                    Visitor status
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/profile?tab=membership">Details</Link>
                  </Button>
                </div>
              </div>
            </section>
          </>
        )}

        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-4">
          {isApprovedMember ? (
            [
              { label: "Progress", value: "Live", hint: "log workouts", icon: TrendingUp, href: "/dashboard/progress", locked: false },
              { label: "Classes", value: "Soon", hint: "next phase", icon: Calendar, href: "/dashboard/classes", locked: true },
              { label: "Check-in", value: "Live", hint: "attendance", icon: MapPin, href: "/dashboard", locked: false },
              { label: "Profile", value: "Ready", hint: "your gym", icon: Target, href: "/profile", locked: false },
            ].map((stat) =>
              stat.locked ? (
                <div
                  key={stat.label}
                  className="cursor-not-allowed bg-card p-5 opacity-60 sm:p-6"
                  title="Coming soon"
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
            )
          ) : (
            [
              { label: "Gyms", value: "Browse", hint: "find gym", icon: Building2, href: "/gyms", locked: false },
              { label: "Profile", value: "Ready", hint: "your info", icon: Target, href: "/profile", locked: false },
              { label: "Classes", value: "Soon", hint: "next phase", icon: Calendar, href: "/dashboard/classes", locked: true },
              { label: "Progress", value: "Locked", hint: "join gym", icon: TrendingUp, href: "#", locked: true },
            ].map((stat) =>
              stat.locked ? (
                <div
                  key={stat.label}
                  className="cursor-not-allowed bg-card p-5 opacity-60 sm:p-6"
                  title="Join a gym to unlock"
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
            )
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-2xl tracking-wide text-foreground sm:text-3xl">
                {isApprovedMember ? "WHAT&apos;S LIVE" : "GET STARTED"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isApprovedMember
                  ? "Core features ready now — classes & payments ship next"
                  : "Join a gym to unlock member features and start your fitness journey"}
              </p>
            </div>

            <div className="space-y-3">
              {isApprovedMember ? (
                [
                  {
                    title: "Workout progress",
                    body: "Log focus, sets, reps, and track your week.",
                    href: "/dashboard/progress",
                    badge: "Live",
                  },
                  {
                    title: "Class booking",
                    body: "Browse your gym's schedule and reserve a spot.",
                    href: "/dashboard/classes",
                    badge: "Live",
                  },
                  {
                    title: "Daily check-in",
                    body: "Mark attendance when you arrive at the gym.",
                    href: "/dashboard",
                    badge: "Live",
                  },
                  {
                    title: "Want a trainer?",
                    body: "Request a trainer from your dashboard — admin approval updates your monthly fee.",
                    href: "/dashboard",
                    badge: "Live",
                  },
                  {
                    title: "Gym association",
                    body: "See your gym, trainer, and membership status.",
                    href: "/profile?tab=membership",
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
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            item.badge === "Live"
                              ? "bg-emerald-500/15 text-emerald-500"
                              : "bg-primary/15 text-primary"
                          }`}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.body}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                ))
              ) : (
                [
                  {
                    title: "Browse gyms",
                    body: "Find gyms in your area and view their facilities, trainers, and membership plans.",
                    href: "/gyms",
                    badge: "Live",
                  },
                  {
                    title: "Join a gym",
                    body: "Request membership at your chosen gym. The admin will approve your request.",
                    href: "/gyms",
                    badge: "Live",
                  },
                  {
                    title: "Edit your profile",
                    body: "Add your fitness goals, preferences, and personal information.",
                    href: "/profile",
                    badge: "Live",
                  },
                  {
                    title: "Workout progress",
                    body: "Once you join a gym, you can log workouts and track your fitness journey.",
                    href: "#",
                    badge: "Locked",
                  },
                ].map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className={`group flex items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm transition-all sm:p-5 ${
                      item.badge === "Locked"
                        ? "cursor-not-allowed opacity-60"
                        : "hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold tracking-tight text-foreground">
                          {item.title}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            item.badge === "Live"
                              ? "bg-emerald-500/15 text-emerald-500"
                              : item.badge === "Locked"
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/15 text-primary"
                          }`}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.body}</p>
                    </div>
                    {item.badge !== "Locked" && (
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    )}
                  </Link>
                ))
              )}
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
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {isApprovedMember ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {membershipLabel}
                    </span>
                    <span className="rounded-full border border-primary/30 px-2.5 py-1 text-xs font-medium capitalize text-primary">
                      {planLabel} plan
                    </span>
                  </>
                ) : hasGym ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold capitalize text-amber-600 dark:text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Pending approval
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    No gym joined
                  </span>
                )}
              </div>
              {hasGym && isCustomer && (
                <p className="mb-3 text-xs text-muted-foreground">
                  Member of <span className="font-medium text-foreground">{user?.gymName}</span>
                  {user?.gymCity ? ` · ${user.gymCity}` : ""}
                </p>
              )}
              <Button asChild variant="outline" size="sm" className="w-full gap-2">
                <Link href="/profile">Edit profile</Link>
              </Button>
            </section>

            <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {isApprovedMember ? "Early access" : "Getting started"}
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {isApprovedMember
                  ? "Check in daily, book classes, track progress, and manage your trainer fee — all live now."
                  : "Browse gyms, request membership, and get approved to start your fitness journey."}
              </p>
              <Button asChild size="sm" className="mt-4 w-full gap-2">
                <Link href={isApprovedMember ? "/dashboard/progress" : "/gyms"}>
                  {isApprovedMember ? (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      Open Progress
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4" />
                      Browse Gyms
                    </>
                  )}
                </Link>
              </Button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
