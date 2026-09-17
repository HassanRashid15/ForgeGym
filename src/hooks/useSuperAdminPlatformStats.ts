"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listManagedUsers, type ManagedUser } from "@/api/admin-users";
import { fetchPendingAdmins, type AdminListItem } from "@/api/auth";
import { queryKeys } from "@/lib/query-keys";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

function joinedAt(u: ManagedUser | AdminListItem) {
  return ("join_date" in u ? u.join_date : null) || u.created_at || null;
}

export type SuperAdminPlatformStats = {
  gymOwners: number;
  approved: number;
  pending: number;
  rejected: number;
  superAdmins: number;
  newThisWeek: number;
  newThisMonth: number;
  buckets: { key: string; label: string; count: number }[];
  maxJoin: number;
  recentOwners: AdminListItem[];
  pendingList: AdminListItem[];
  rejectedList: AdminListItem[];
  approvedList: AdminListItem[];
  /** Full lists for statistics / billing */
  allOwners: AdminListItem[];
  allApproved: AdminListItem[];
  allPending: AdminListItem[];
  allRejected: AdminListItem[];
};

/**
 * Platform metrics for super admin — gym owners from DB + realtime refresh.
 */
export function useSuperAdminPlatformStats(enabled = true) {
  const { user, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const instanceId = useRef(Math.random().toString(36).slice(2, 9));
  const active = enabled && isSuperAdmin;

  const usersQuery = useQuery({
    queryKey: queryKeys.managedUsers,
    queryFn: async () => {
      const data = await listManagedUsers();
      return data.users || [];
    },
    enabled: active,
  });

  const pendingQuery = useQuery({
    queryKey: queryKeys.pendingAdmins,
    queryFn: fetchPendingAdmins,
    enabled: active,
  });

  useEffect(() => {
    if (!active || !user?.id) return;

    const supabaseClient = supabase;
    const channelName = `super-admin-platform:${user.id}:${instanceId.current}`;
    const channel = supabaseClient.channel(channelName);
    let timer: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      // Debounce realtime storms — one refetch per 8s window
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        void queryClient.invalidateQueries({ queryKey: queryKeys.managedUsers });
        void queryClient.invalidateQueries({ queryKey: queryKeys.pendingAdmins });
      }, 8000);
    };

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gyms" },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        refresh,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabaseClient.removeChannel(channel);
    };
  }, [active, user?.id, queryClient]);

  const users = usersQuery.data ?? [];
  const pendingData = pendingQuery.data;

  const stats: SuperAdminPlatformStats = useMemo(() => {
    const owners = pendingData?.admins ?? [];
    const pending = pendingData?.pending ?? [];
    const approved = pendingData?.approved ?? [];
    const rejected = pendingData?.rejected ?? [];
    const superAdmins = users.filter((u) => u.is_super_admin).length;

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const source =
      owners.length > 0
        ? owners
        : users.filter((u) => u.role === "admin" && !u.is_super_admin);

    const newThisWeek = source.filter((u) => {
      const raw = joinedAt(u);
      if (!raw) return false;
      const d = new Date(raw);
      return !Number.isNaN(d.getTime()) && d >= weekAgo;
    }).length;

    const newThisMonth = source.filter((u) => {
      const raw = joinedAt(u);
      if (!raw) return false;
      const d = new Date(raw);
      return !Number.isNaN(d.getTime()) && d >= monthAgo;
    }).length;

    const buckets: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({ key, label: monthLabel(key), count: 0 });
    }
    const bucketMap = new Map(buckets.map((b) => [b.key, b]));
    for (const u of source) {
      const key = monthKey(joinedAt(u));
      if (!key) continue;
      const b = bucketMap.get(key);
      if (b) b.count += 1;
    }
    const maxJoin = Math.max(1, ...buckets.map((b) => b.count));

    const recentOwners = [...(pendingData?.admins ?? [])]
      .sort((a, b) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return db - da;
      })
      .slice(0, 8);

    return {
      gymOwners: owners.length || source.length,
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
      superAdmins,
      newThisWeek,
      newThisMonth,
      buckets,
      maxJoin,
      recentOwners,
      pendingList: pending.slice(0, 6),
      rejectedList: rejected.slice(0, 5),
      approvedList: approved.slice(0, 5),
      allOwners: owners,
      allApproved: approved,
      allPending: pending,
      allRejected: rejected,
    };
  }, [users, pendingData]);

  const loading =
    (usersQuery.isPending && !usersQuery.data) ||
    (pendingQuery.isPending && !pendingQuery.data);

  const isFetching = usersQuery.isFetching || pendingQuery.isFetching;

  return {
    stats,
    loading,
    isFetching,
    error:
      usersQuery.error instanceof Error
        ? usersQuery.error.message
        : pendingQuery.error instanceof Error
          ? pendingQuery.error.message
          : null,
  };
}
