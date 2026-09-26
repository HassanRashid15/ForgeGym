"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/** Shared presence channel for all signed-in app users (members, staff, trainers, admins). */
const CHANNEL = "forge-user-presence";

type PresenceMeta = {
  user_id: string;
  name?: string;
  role?: string;
  is_super_admin?: boolean;
  online_at?: string;
};

type AdminPresenceValue = {
  /** User IDs currently connected (Realtime Presence). */
  onlineIds: ReadonlySet<string>;
  isOnline: (userId: string | null | undefined) => boolean;
  onlineCount: number;
};

const AdminPresenceContext = createContext<AdminPresenceValue>({
  onlineIds: new Set(),
  isOnline: () => false,
  onlineCount: 0,
});

function presenceIdsFromState(
  state: Record<string, PresenceMeta[] | undefined>,
): Set<string> {
  const ids = new Set<string>();
  for (const [key, metas] of Object.entries(state)) {
    if (!metas?.length) continue;
    const id = metas[0]?.user_id || key;
    if (id) ids.add(id);
  }
  return ids;
}

/**
 * Every authenticated user tracks presence while the dashboard shell is open.
 * Admins / super-admins read `onlineIds` on Users lists for live Online/Offline.
 */
export function AdminPresenceProvider({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin, isLoading, isAuthenticated } = useAuth();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user?.id) {
      setOnlineIds(new Set());
      return;
    }

    const userId = user.id;
    const channel = supabase.channel(CHANNEL, {
      config: {
        presence: { key: userId },
      },
    });

    const sync = () => {
      setOnlineIds(presenceIdsFromState(channel.presenceState<PresenceMeta>()));
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        try {
          await channel.track({
            user_id: userId,
            name: user.name || "",
            role: user.role || "user",
            is_super_admin: Boolean(isSuperAdmin || user.isSuperAdmin),
            online_at: new Date().toISOString(),
          } satisfies PresenceMeta);
        } catch {
          /* presence track failed — list just shows offline */
        }
      });

    return () => {
      void channel.untrack().catch(() => undefined);
      void supabase.removeChannel(channel);
    };
  }, [
    isLoading,
    isAuthenticated,
    isSuperAdmin,
    user?.id,
    user?.name,
    user?.role,
    user?.isSuperAdmin,
  ]);

  const value = useMemo<AdminPresenceValue>(
    () => ({
      onlineIds,
      onlineCount: onlineIds.size,
      isOnline: (id) => Boolean(id && onlineIds.has(id)),
    }),
    [onlineIds],
  );

  return (
    <AdminPresenceContext.Provider value={value}>
      {children}
    </AdminPresenceContext.Provider>
  );
}

export function useAdminPresence() {
  return useContext(AdminPresenceContext);
}
