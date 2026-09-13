import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import {
  markNotificationAsRead,
  dismissNotification,
  deleteNotification,
} from "@/lib/notifications";

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/notifications/[id] — mark as read or dismiss */
export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { id: notificationId } = await params;
  if (!notificationId) {
    return NextResponse.json({ error: "Notification id required" }, { status: 400 });
  }

  const { user, supabase } = auth;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.action === "mark_read") {
    const success = await markNotificationAsRead(notificationId, user.id, supabase);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to mark notification as read" },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true });
  }

  if (body.action === "dismiss") {
    const success = await dismissNotification(notificationId, user.id, supabase);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to dismiss notification" },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/** DELETE /api/notifications/[id] — delete notification */
export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { id: notificationId } = await params;
  if (!notificationId) {
    return NextResponse.json({ error: "Notification id required" }, { status: 400 });
  }

  const { user, supabase } = auth;
  const success = await deleteNotification(notificationId, user.id, supabase);
  if (!success) {
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
