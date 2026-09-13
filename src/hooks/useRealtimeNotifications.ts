/**
 * Real-time Notifications Hook
 * Subscribes to both `notifications` and `admin_notifications`.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Notification } from "@/lib/notifications";

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function fetchNotificationsApi(query = "limit=50") {
  const headers = await authHeaders();
  const response = await fetch(`/api/notifications?${query}`, {
    headers,
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch notifications");
  return response.json();
}

function mapAdminPayload(row: {
  id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}): Notification {
  return {
    id: row.id,
    user_id: row.recipient_user_id,
    type: (row.type as Notification["type"]) || "system",
    title: row.title,
    message: row.message,
    metadata: {},
    unread: !row.read_at,
    dismissed: false,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

function mapUserPayload(row: {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  unread: boolean;
  dismissed: boolean;
  created_at: string;
  updated_at?: string;
}): Notification {
  return {
    id: row.id,
    user_id: row.user_id,
    type: (row.type as Notification["type"]) || "system",
    title: row.title,
    message: row.message,
    metadata: row.metadata || {},
    unread: !!row.unread,
    dismissed: !!row.dismissed,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
  };
}

export function useRealtimeNotifications(options?: {
  enabled?: boolean;
  onNewNotification?: (notification: Notification) => void;
  onNotificationUpdate?: (notification: Notification) => void;
}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { enabled = true, onNewNotification, onNotificationUpdate } = options || {};

  // Keep callbacks in refs so the subscription effect does not re-run every render
  const onNewRef = useRef(onNewNotification);
  const onUpdateRef = useRef(onNotificationUpdate);
  onNewRef.current = onNewNotification;
  onUpdateRef.current = onNotificationUpdate;

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const data = await fetchNotificationsApi("limit=50");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError(err as Error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !enabled) return;

    let cancelled = false;

    void fetchNotifications();

    const subscription = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const newNotification = mapAdminPayload(
            payload.new as Parameters<typeof mapAdminPayload>[0],
          );
          setNotifications((prev) => [newNotification, ...prev]);
          if (newNotification.unread) {
            setUnreadCount((prev) => prev + 1);
          }
          onNewRef.current?.(newNotification);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "admin_notifications",
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const updated = mapAdminPayload(
            payload.new as Parameters<typeof mapAdminPayload>[0],
          );
          const oldReadAt = (payload.old as { read_at?: string | null }).read_at;
          const wasUnread = !oldReadAt;

          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n)),
          );

          if (wasUnread !== updated.unread) {
            setUnreadCount((prev) => {
              if (updated.unread) return prev + 1;
              return Math.max(0, prev - 1);
            });
          }

          onUpdateRef.current?.(updated);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "admin_notifications",
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const deleted = payload.old as {
            id: string;
            read_at?: string | null;
          };
          setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
          if (!deleted.read_at) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const newNotification = mapUserPayload(
            payload.new as Parameters<typeof mapUserPayload>[0],
          );
          if (newNotification.dismissed) return;
          setNotifications((prev) => [newNotification, ...prev]);
          if (newNotification.unread) {
            setUnreadCount((prev) => prev + 1);
          }
          onNewRef.current?.(newNotification);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const updated = mapUserPayload(
            payload.new as Parameters<typeof mapUserPayload>[0],
          );
          const oldRow = payload.old as {
            unread?: boolean;
            dismissed?: boolean;
          };

          if (updated.dismissed) {
            setNotifications((prev) => prev.filter((n) => n.id !== updated.id));
          } else {
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n)),
            );
          }

          const oldCounted = !!oldRow.unread && !oldRow.dismissed;
          const newCounted = updated.unread && !updated.dismissed;
          if (oldCounted !== newCounted) {
            setUnreadCount((prev) => {
              if (newCounted) return prev + 1;
              return Math.max(0, prev - 1);
            });
          }

          onUpdateRef.current?.(updated);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          const deleted = payload.old as {
            id: string;
            unread?: boolean;
            dismissed?: boolean;
          };
          setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
          if (deleted.unread && !deleted.dismissed) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        },
      )
      .subscribe((status) => {
        if (!cancelled) setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(subscription);
    };
  }, [user?.id, enabled, fetchNotifications]);

  const refresh = useCallback(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isConnected,
    error,
    refresh,
  };
}

/** Header badge — unread count only (lightweight; does not load full inbox). */
export function useUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const fetchInitialCount = async () => {
      try {
        const data = await fetchNotificationsApi("count_only=true");
        if (!cancelled) setUnreadCount(data.unreadCount || 0);
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    void fetchInitialCount();

    const subscription = supabase
      .channel(`unread-count:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_notifications",
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            const row = payload.new as { read_at: string | null };
            if (!row.read_at) setUnreadCount((prev) => prev + 1);
          } else if (payload.eventType === "UPDATE") {
            const oldUnread = !(payload.old as { read_at?: string | null }).read_at;
            const newUnread = !(payload.new as { read_at?: string | null }).read_at;
            if (oldUnread !== newUnread) {
              setUnreadCount((prev) => {
                if (newUnread) return prev + 1;
                return Math.max(0, prev - 1);
              });
            }
          } else if (payload.eventType === "DELETE") {
            const deletedUnread = !(payload.old as { read_at?: string | null })
              .read_at;
            if (deletedUnread) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            const row = payload.new as { unread?: boolean; dismissed?: boolean };
            if (row.unread && !row.dismissed) setUnreadCount((prev) => prev + 1);
          } else if (payload.eventType === "UPDATE") {
            const oldRow = payload.old as { unread?: boolean; dismissed?: boolean };
            const newRow = payload.new as { unread?: boolean; dismissed?: boolean };
            const oldCounted = !!oldRow.unread && !oldRow.dismissed;
            const newCounted = !!newRow.unread && !newRow.dismissed;
            if (oldCounted !== newCounted) {
              setUnreadCount((prev) => {
                if (newCounted) return prev + 1;
                return Math.max(0, prev - 1);
              });
            }
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { unread?: boolean; dismissed?: boolean };
            if (deleted.unread && !deleted.dismissed) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        },
      )
      .subscribe((status) => {
        if (!cancelled) setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(subscription);
    };
  }, [user?.id]);

  return { unreadCount, isConnected };
}
