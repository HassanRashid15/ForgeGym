import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from "@/lib/notifications";

/** GET /api/notifications — fetch user notifications */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user, supabase } = auth;
  const { searchParams } = new URL(request.url);

  const countOnly = searchParams.get("count_only") === "true";
  if (countOnly) {
    const unreadCount = await getUnreadNotificationCount(user.id, supabase);
    return NextResponse.json({ notifications: [], unreadCount });
  }

  const unreadOnly = searchParams.get("unread_only") === "true";
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(user.id, {
      unreadOnly,
      limit,
      offset,
      client: supabase,
    }),
    getUnreadNotificationCount(user.id, supabase),
  ]);

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}

/** PATCH /api/notifications — mark all as read */
export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user, supabase } = auth;
  const body = await request.json();

  if (body.action === "mark_all_read") {
    const success = await markAllNotificationsAsRead(user.id, supabase);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to mark notifications as read" },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
