"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminGymStats, formatMoney } from "@/hooks/useAdminGymStats";
import { usePlatformFacilityFee } from "@/hooks/usePlatformFacilityFee";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getNameInitials } from "@/lib/utils";
import { AdminTrialBanner } from "@/components/admin/AdminTrialBanner";
import { AdminPlatformFeeCard } from "@/components/admin/AdminPlatformFeeCard";
import { AdminWelcomeModal } from "@/components/admin/AdminWelcomeModal";
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
  UserCheck,
  X,
  RefreshCw,
  Snowflake,
} from "lucide-react";
import { toast } from "sonner";
import {
  listManagedUsers,
  type ManagedUser,
} from "@/api/admin-users";
import {
  getPendingMembers,
  approvePendingMember,
  rejectPendingMember,
  renewFrozenAccount,
  type PendingMember,
} from "@/api/pending-members";
import { queryKeys } from "@/lib/query-keys";
import { ContactMessagesCard } from "@/components/admin/ContactMessagesCard";
import { checkWelcomeModal } from "@/api/admin-welcome";

interface AdminDashboardHomeProps {
  initialWelcomeData?: {
    checked: boolean;
    showModal: boolean;
    gymName?: string;
    userName?: string;
  };
}

/**
 * Admin home at /dashboard — live stats from Users + Monthly Fee (DB + realtime).
 */
export function AdminDashboardHome({ initialWelcomeData }: AdminDashboardHomeProps = {}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const firstName = (user?.name || "Owner").trim().split(/\s+/)[0];
  const { stats, loading, isFetching } = useAdminGymStats(true);
  const facilityFeeQuery = usePlatformFacilityFee(true);
  const facilityFee = facilityFeeQuery.data?.platformFacilityFee || null;
  const gymHref = user?.id ? `/gyms/${user.gymOwnerId || user.id}` : "/dashboard";

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(initialWelcomeData?.showModal || false);
  // Only skip client check when SSR successfully evaluated an authenticated user
  const [welcomeModalChecked, setWelcomeModalChecked] = useState(
    initialWelcomeData?.checked === true,
  );

  const pendingMembersQuery = useQuery({
    queryKey: ["pendingMembers"],
    queryFn: getPendingMembers,
    refetchInterval: 1000, // Refresh every 1 second
    enabled: true,
  });

  // Update local state when query data changes
  useEffect(() => {
    if (pendingMembersQuery.data?.pendingMembers) {
      setPendingMembers(pendingMembersQuery.data.pendingMembers);
    }
  }, [pendingMembersQuery.data]);

  // Check if welcome modal should be shown for first-time approved admins
  useEffect(() => {
    if (welcomeModalChecked || !user?.id) return;

    const check = async () => {
      try {
        const data = await checkWelcomeModal();
        if (data.showModal === true) {
          setShowWelcomeModal(true);
        }
      } catch (error) {
        console.error("Failed to check welcome modal status:", error);
      } finally {
        setWelcomeModalChecked(true);
      }
    };

    void check();
  }, [user?.id, welcomeModalChecked]);

  const handleApproveMember = async (userId: string) => {
    setApprovingId(userId);
    try {
      await approvePendingMember(userId);
      toast.success("Member approved — they can sign in now.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.managedUsers }),
        queryClient.invalidateQueries({ queryKey: queryKeys.monthlyMembers }),
        queryClient.invalidateQueries({ queryKey: ["pendingMembers"] }),
      ]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to approve member");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectMember = async (userId: string) => {
    setRejectingId(userId);
    try {
      await rejectPendingMember(userId);
      toast.success("Membership request rejected.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.managedUsers }),
        queryClient.invalidateQueries({ queryKey: queryKeys.monthlyMembers }),
        queryClient.invalidateQueries({ queryKey: ["pendingMembers"] }),
      ]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reject member");
    } finally {
      setRejectingId(null);
    }
  };

  const handleRenewAccount = async (userId: string, trialType?: "platform" | "membership") => {
    setRenewingId(userId);
    try {
      const result = await renewFrozenAccount(userId, trialType);
      toast.success("Trial renewed successfully — account unfrozen.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.managedUsers }),
        queryClient.invalidateQueries({ queryKey: queryKeys.monthlyMembers }),
        queryClient.invalidateQueries({ queryKey: ["pendingMembers"] }),
      ]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to renew account");
    } finally {
      setRenewingId(null);
    }
  };
  const heroImage = user?.gymMainImageUrl || "/images/hero-gym.jpg";
  const gymLabel = stats.gymName || user?.gymName;

  return (
    <div className="relative min-h-full -mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
      <AdminWelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        gymName={initialWelcomeData?.gymName || stats.gymName || user?.gymName}
        userName={initialWelcomeData?.userName || user?.name}
      />

      <section className="relative isolate w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt=""
          className="block h-[65vh] w-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-background/10" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-end gap-4 px-4 py-6 sm:px-6 sm:py-8 md:flex-row md:items-end md:justify-between lg:px-8">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
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
            <h1 className="font-display text-3xl tracking-wide text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              WELCOME,{" "}
              <span className="text-gradient">{firstName.toUpperCase()}</span>
            </h1>
            <p className="max-w-md text-sm text-muted-foreground sm:text-base">
              {gymLabel
                ? `Running ${gymLabel}. Members, fees, and growth update from your database in realtime.`
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
            <Button asChild variant="outline" className="gap-2 border-border/80 bg-background/40 backdrop-blur-sm">
              <Link href="/dashboard/users">
                <Users className="h-4 w-4" />
                Manage users
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="relative space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <AdminTrialBanner trial={user?.trial} facilityFee={facilityFee} />

        <AdminPlatformFeeCard
          facilityFee={facilityFee}
          loading={facilityFeeQuery.isPending && !facilityFee}
          trial={user?.trial}
          platformFeeStatus={facilityFeeQuery.data?.platformFeeStatus}
          concessionAmount={facilityFeeQuery.data?.concessionAmount}
        />

        {loading ? (
          <div className="flex min-h-[20vh] items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading live stats…
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-4 shadow-sm sm:p-5 md:p-6">
              <div className="mb-4 flex min-w-0 flex-wrap items-center gap-2">
                <UserCheck className="h-5 w-5 shrink-0 text-amber-600" />
                <h2 className="text-base font-semibold text-foreground sm:text-lg">
                  Pending Member Approvals
                </h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    pendingMembers.length > 0
                      ? "bg-amber-500/20 text-amber-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {pendingMembers.length}
                </span>
              </div>
              {pendingMembersQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : pendingMembers.length > 0 ? (
                <div className="space-y-3">
                  {pendingMembers.slice(0, 3).map((member) => {
                    const isFrozenDueToTrial =
                      member.is_frozen && member.freeze_reason === "trial_expiration";
                    return (
                      <div
                        key={member.user_id}
                        className={`flex flex-col gap-3 rounded-lg border bg-card/50 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
                          isFrozenDueToTrial
                            ? "border-red-500/50 bg-red-950/10"
                            : "border-border/60"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage
                              src={member.avatar_url}
                              alt={member.full_name || "User"}
                            />
                            <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                              {getNameInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium text-foreground">
                                {member.full_name || "Unknown"}
                              </p>
                              {isFrozenDueToTrial && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                                  <Snowflake className="h-3 w-3" />
                                  Trial Expired
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {member.email}
                            </p>
                            {member.phone && (
                              <p className="truncate text-xs text-muted-foreground">
                                {member.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">
                          {isFrozenDueToTrial ? (
                            <Button
                              size="sm"
                              className="flex-1 gap-1.5 bg-red-600 hover:bg-red-700 sm:flex-none"
                              onClick={() =>
                                handleRenewAccount(
                                  member.user_id,
                                  member.membership_trial_ends_at
                                    ? "membership"
                                    : "platform",
                                )
                              }
                              disabled={renewingId === member.user_id}
                            >
                              {renewingId === member.user_id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                              Renew
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                className="flex-1 gap-1.5 sm:flex-none"
                                onClick={() => handleApproveMember(member.user_id)}
                                disabled={approvingId === member.user_id}
                              >
                                {approvingId === member.user_id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <UserCheck className="h-3.5 w-3.5" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 gap-1.5 sm:flex-none"
                                onClick={() => handleRejectMember(member.user_id)}
                                disabled={rejectingId === member.user_id}
                              >
                                {rejectingId === member.user_id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <X className="h-3.5 w-3.5" />
                                )}
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-2 py-8 text-center sm:py-10">
                  <UserCheck className="mb-3 h-10 w-10 text-muted-foreground/50 sm:h-12 sm:w-12" />
                  <p className="text-sm text-muted-foreground">
                    No pending member approvals
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    New member requests will appear here automatically
                  </p>
                </div>
              )}
              <div className="mt-4 border-t border-border/50 pt-3">
                <Button asChild variant="outline" size="sm" className="w-full gap-2">
                  <Link href="/dashboard/users">
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </section>

            <ContactMessagesCard />

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
                    Same fee as above — set by platform owner for gym owner access.
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
