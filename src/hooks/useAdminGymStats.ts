"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listManagedUsers, listMonthlyMembers, type ManagedUser, type MonthlyMember } from "@/api/admin-users";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseFeeAmount } from "@/lib/fees";

export function parseFee(fee: string | null | undefined): number {
  return parseFeeAmount(fee);
}

export function formatMoney(amount: number, feeLabel: string | null): string {
  const hasCurrency = Boolean(feeLabel && /[^0-9.\s]/.test(feeLabel));
  if (hasCurrency) {
    const symbol = String(feeLabel).replace(/[0-9.,\s]/g, "").trim() || "";
    return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  return amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function monthKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

function joinedAt(u: ManagedUser) {
  return u.join_date || u.created_at || null;
}

export type AdminGymStats = {
  members: number;
  trainers: number;
  pending: number;
  active: number;
  newThisWeek: number;
  newThisMonth: number;
  projectedEarnings: number;
  billableCount: number;
  monthlyFee: string | null;
  trainerFee: string | null;
  feeAmount: number;
  gymName: string | null;
  buckets: { key: string; label: string; count: number }[];
  maxJoin: number;
  recent: ManagedUser[];
  expiringSoon: MonthlyMember[];
};

/**
 * Live gym metrics from Users + Monthly Fee (DB), with realtime refresh on profile changes.
 */
export function useAdminGymStats(enabled = true) {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const instanceId = useRef(Math.random().toString(36).slice(2, 9));
  const active = enabled && isAdmin && !isSuperAdmin;

  const usersQuery = useQuery({
    queryKey: queryKeys.managedUsers,
    queryFn: async () => {
      const data = await listManagedUsers();
      return data.users || [];
    },
    enabled: active,
  });

  const monthlyQuery = useQuery({
    queryKey: queryKeys.monthlyMembers,
    queryFn: listMonthlyMembers,
    enabled: active,
  });

  useEffect(() => {
    if (!active || !user?.id) return;

    const supabaseClient = supabase;
    const gymOwnerId = user.gymOwnerId || user.id;
    const channelName = `admin-gym-stats:${gymOwnerId}:${instanceId.current}`;
    const channel = supabaseClient.channel(channelName);

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.managedUsers });
      void queryClient.invalidateQueries({ queryKey: queryKeys.monthlyMembers });
    };

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `gym_owner_id=eq.${gymOwnerId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${gymOwnerId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gyms",
          filter: `owner_user_id=eq.${gymOwnerId}`,
        },
        refresh,
      )
      .subscribe();

    return () => {
      void supabaseClient.removeChannel(channel);
    };
  }, [active, user?.id, user?.gymOwnerId, queryClient]);

  const users = usersQuery.data ?? [];
  const monthly = monthlyQuery.data;
  const billable = monthly?.members ?? [];
  const monthlyFee = monthly?.monthlyFee ?? null;
  const trainerFee = monthly?.trainerFee ?? null;
  const feeAmount = parseFee(monthlyFee);

  const stats: AdminGymStats = useMemo(() => {
    const members = users.filter((u) => u.role === "user");
    const trainers = users.filter((u) => u.role === "trainer");
    const pending = members.filter(
      (u) =>
        u.admin_approved === false ||
        String(u.membership_status || "").toLowerCase() === "pending" ||
        String(u.account_status || "").toLowerCase() === "pending",
    );
    const activeMembers = members.filter((u) => {
      const status = String(u.membership_status || u.account_status || "").toLowerCase();
      return (
        u.admin_approved !== false &&
        status !== "pending" &&
        status !== "rejected"
      );
    });

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const newThisWeek = members.filter((u) => {
      const raw = joinedAt(u);
      if (!raw) return false;
      const d = new Date(raw);
      return !Number.isNaN(d.getTime()) && d >= weekAgo;
    }).length;

    const newThisMonth = members.filter((u) => {
      const raw = joinedAt(u);
      if (!raw) return false;
      const d = new Date(raw);
      return !Number.isNaN(d.getTime()) && d >= monthAgo;
    }).length;

    // Per-member fees (trainer add-on when preferred_trainer_id is set)
    const projectedEarnings = billable.reduce(
      (sum, m) => sum + parseFee(m.monthlyFee),
      0,
    );

    const buckets: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({ key, label: monthLabel(key), count: 0 });
    }
    const bucketMap = new Map(buckets.map((b) => [b.key, b]));
    for (const u of members) {
      const key = monthKey(joinedAt(u));
      if (!key) continue;
      const b = bucketMap.get(key);
      if (b) b.count += 1;
    }
    const maxJoin = Math.max(1, ...buckets.map((b) => b.count));

    const recent = [...members]
      .sort((a, b) => {
        const da = new Date(joinedAt(a) || 0).getTime();
        const db = new Date(joinedAt(b) || 0).getTime();
        return db - da;
      })
      .slice(0, 6);

    const expiringSoon = [...billable]
      .filter((m) => typeof m.daysLeft === "number" && m.daysLeft <= 7)
      .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99))
      .slice(0, 5);

    return {
      members: members.length,
      trainers: trainers.length,
      pending: pending.length,
      active: activeMembers.length || billable.length,
      newThisWeek,
      newThisMonth,
      projectedEarnings,
      billableCount: billable.length,
      monthlyFee,
      trainerFee,
      feeAmount,
      gymName: monthly?.gymName ?? user?.gymName ?? null,
      buckets,
      maxJoin,
      recent,
      expiringSoon,
    };
  }, [users, billable, feeAmount, monthlyFee, trainerFee, monthly?.gymName, user?.gymName]);

  const loading =
    (usersQuery.isPending && !usersQuery.data) ||
    (monthlyQuery.isPending && !monthlyQuery.data);

  const isFetching = usersQuery.isFetching || monthlyQuery.isFetching;

  return {
    stats,
    loading,
    isFetching,
    users,
    billable,
    error:
      usersQuery.error instanceof Error
        ? usersQuery.error.message
        : monthlyQuery.error instanceof Error
          ? monthlyQuery.error.message
          : null,
  };
}
