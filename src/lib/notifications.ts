import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type NotificationType =
  | "confirmation"
  | "maintenance"
  | "directive"
  | "info"
  | "alert"
  | "booking"
  | "payment"
  | "achievement"
  | "reminder"
  | "system"
  | "welcome"
  | "membership"
  | "class_update"
  | "promotion"
  | "feedback"
  | "security"
  | "admin_approval_request"
  | "member_approval_request";

const ADMIN_INBOX_TYPES = new Set<NotificationType>([
  "admin_approval_request",
  "member_approval_request",
]);

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  unread: boolean;
  dismissed: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationMetadata {
  related_id?: string;
  related_type?: string;
  action_url?: string;
  icon?: string;
  priority?: "low" | "medium" | "high";
}

export interface CreateNotificationParams {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: NotificationMetadata;
}

type DbClient = SupabaseClient<any>;

type AdminNotificationRow = {
  id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
  from_user_id?: string | null;
};

function mapAdminRow(row: AdminNotificationRow): Notification {
  return {
    id: row.id,
    user_id: row.recipient_user_id,
    type: (row.type as NotificationType) || "system",
    title: row.title,
    message: row.message,
    metadata: row.from_user_id ? { related_id: row.from_user_id } : {},
    unread: !row.read_at,
    dismissed: false,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

function isMissingTableError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    /could not find the table/i.test(error.message || "") ||
    /schema cache/i.test(error.message || "")
  );
}

function isJwtClockError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST303" ||
    /jwt issued at future/i.test(error.message || "") ||
    /token.*future/i.test(error.message || "")
  );
}

function logDbError(context: string, error: { code?: string; message?: string }) {
  if (isJwtClockError(error)) {
    console.warn(
      `${context}: JWT clock skew (PGRST303). Sync Windows time, then re-copy SUPABASE_SERVICE_ROLE_KEY from the dashboard.`,
      error.message,
    );
    return;
  }
  console.error(context, error);
}

function mergeByNewest(a: Notification[], b: Notification[]): Notification[] {
  const map = new Map<string, Notification>();
  for (const n of [...a, ...b]) map.set(n.id, n);
  return [...map.values()].sort(
    (x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime(),
  );
}

/** Prefer caller client (user session / RLS); fall back to service role. */
function resolveClient(client?: DbClient | null): DbClient | null {
  return client || createSupabaseServiceClient();
}

function adminNotifications(client: DbClient) {
  return client.from("admin_notifications");
}

async function insertAdminNotification(
  params: CreateNotificationParams,
): Promise<Notification | null> {
  const service = createSupabaseServiceClient();
  if (!service) return null;

  const { data, error } = await adminNotifications(service)
    .insert({
      recipient_user_id: params.user_id,
      type: params.type,
      title: params.title,
      message: params.message,
      from_user_id:
        typeof params.metadata?.related_id === "string"
          ? params.metadata.related_id
          : null,
    })
    .select()
    .single();

  if (error) {
    logDbError("Error creating admin notification:", error);
    return null;
  }

  return mapAdminRow(data as AdminNotificationRow);
}

export async function getUserNotifications(
  userId: string,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
    client?: DbClient | null;
  },
): Promise<Notification[]> {
  const db = resolveClient(options?.client);
  if (!db) return [];

  let generalQuery = db
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("dismissed", false)
    .order("created_at", { ascending: false });

  if (options?.unreadOnly) generalQuery = generalQuery.eq("unread", true);
  if (options?.limit) generalQuery = generalQuery.limit(options.limit);
  if (options?.offset) {
    generalQuery = generalQuery.range(
      options.offset,
      options.offset + (options.limit || 10) - 1,
    );
  }

  let adminQuery = adminNotifications(db)
    .select("*")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false });

  if (options?.unreadOnly) adminQuery = adminQuery.is("read_at", null);
  if (options?.limit) adminQuery = adminQuery.limit(options.limit);
  if (options?.offset) {
    adminQuery = adminQuery.range(
      options.offset,
      options.offset + (options.limit || 10) - 1,
    );
  }

  const [generalRes, adminRes] = await Promise.all([generalQuery, adminQuery]);

  let general: Notification[] = [];
  let admin: Notification[] = [];

  if (!generalRes.error) {
    general = (generalRes.data as Notification[]) || [];
  } else if (!isMissingTableError(generalRes.error)) {
    logDbError("Error fetching notifications:", generalRes.error);
  }

  if (adminRes.error) {
    logDbError("Error fetching admin_notifications:", adminRes.error);
  } else {
    admin = ((adminRes.data || []) as AdminNotificationRow[]).map(mapAdminRow);
  }

  const merged = mergeByNewest(general, admin);
  if (options?.limit) return merged.slice(0, options.limit);
  return merged;
}

export async function getUnreadNotificationCount(
  userId: string,
  client?: DbClient | null,
): Promise<number> {
  const db = resolveClient(client);
  if (!db) return 0;

  const [generalRes, adminRes] = await Promise.all([
    db
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("unread", true)
      .eq("dismissed", false),
    adminNotifications(db)
      .select("*", { count: "exact", head: true })
      .eq("recipient_user_id", userId)
      .is("read_at", null),
  ]);

  let generalCount = 0;
  let adminCount = 0;

  if (!generalRes.error) {
    generalCount = generalRes.count || 0;
  } else if (!isMissingTableError(generalRes.error)) {
    logDbError("Error fetching unread count:", generalRes.error);
  }

  if (adminRes.error) {
    logDbError("Error fetching admin unread count:", adminRes.error);
  } else {
    adminCount = adminRes.count || 0;
  }

  return generalCount + adminCount;
}

export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
  client?: DbClient | null,
): Promise<boolean> {
  const db = resolveClient(client);
  if (!db) return false;

  const { data, error } = await db
    .from("notifications")
    .update({ unread: false })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id");

  if (!error && data && data.length > 0) return true;

  if (error && !isMissingTableError(error)) {
    logDbError("Error marking notification as read:", error);
  }

  const { error: adminError } = await adminNotifications(db)
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("recipient_user_id", userId);

  if (adminError) {
    logDbError("Error marking admin notification as read:", adminError);
    return false;
  }

  return true;
}

export async function markAllNotificationsAsRead(
  userId: string,
  client?: DbClient | null,
): Promise<boolean> {
  const db = resolveClient(client);
  if (!db) return false;

  const { error } = await db
    .from("notifications")
    .update({ unread: false })
    .eq("user_id", userId)
    .eq("unread", true);

  if (error && !isMissingTableError(error)) {
    logDbError("Error marking all notifications as read:", error);
  }

  const { error: adminError } = await adminNotifications(db)
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_user_id", userId)
    .is("read_at", null);

  if (adminError) {
    logDbError("Error marking all admin notifications as read:", adminError);
    return false;
  }

  return true;
}

export async function dismissNotification(
  notificationId: string,
  userId: string,
  client?: DbClient | null,
): Promise<boolean> {
  const db = resolveClient(client);
  if (!db) return false;

  const { data, error } = await db
    .from("notifications")
    .update({ dismissed: true, unread: false })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id");

  if (!error && data && data.length > 0) return true;

  if (error && !isMissingTableError(error)) {
    logDbError("Error dismissing notification:", error);
  }

  return markNotificationAsRead(notificationId, userId, db);
}

export async function createNotification(
  params: CreateNotificationParams,
): Promise<Notification | null> {
  const service = createSupabaseServiceClient();
  if (!service) return null;

  if (ADMIN_INBOX_TYPES.has(params.type)) {
    return insertAdminNotification(params);
  }

  const { data, error } = await service
    .from("notifications")
    .insert({
      user_id: params.user_id,
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: (params.metadata || {}) as never,
    })
    .select()
    .single();

  if (!error) return data as Notification;

  logDbError("notifications insert failed, falling back:", error);
  return insertAdminNotification(params);
}

export async function deleteNotification(
  notificationId: string,
  userId: string,
  client?: DbClient | null,
): Promise<boolean> {
  const db = resolveClient(client);
  if (!db) return false;

  const { data, error } = await db
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id");

  if (!error && data && data.length > 0) return true;

  if (error && !isMissingTableError(error)) {
    logDbError("Error deleting notification:", error);
  }

  const { error: adminError } = await adminNotifications(db)
    .delete()
    .eq("id", notificationId)
    .eq("recipient_user_id", userId);

  if (adminError) {
    logDbError("Error deleting admin notification:", adminError);
    return false;
  }

  return true;
}
