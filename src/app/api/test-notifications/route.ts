import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import { sendTemplatedNotification } from "@/lib/notification-templates";

/** POST /api/test-notifications — sample notifications (dev + super admin only) */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const { user } = auth;
  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  const { data: profile } = await service
    .from("profiles")
    .select("is_super_admin, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const email = (profile?.email || user.email || "").toLowerCase();
  const isSuperAdmin =
    profile?.is_super_admin === true || email === "superadmin@forge.test";

  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  const results = await Promise.allSettled([
    createNotification({
      user_id: user.id,
      type: "confirmation",
      title: "Hypertrophy Clinic Booking Confirmed",
      message:
        "Your slot for the 18:00 Hypertrophy Clinic is secured. Arrive 10 minutes early for mobilization protocol.",
      metadata: { icon: "event_available", priority: "high" as const },
    }),
    createNotification({
      user_id: user.id,
      type: "maintenance",
      title: "Squat Rack Alpha Offline",
      message:
        "Squat Rack Alpha is currently undergoing structural maintenance. Please utilize Beta or Gamma racks.",
      metadata: { icon: "warning", priority: "high" as const },
    }),
    sendTemplatedNotification(user.id, {
      type: "directive",
      title: "Embrace the Resistance",
      message:
        "The iron never lies to you. You can walk outside and listen to all kinds of talk, get told that you're a god or a total bastard. The iron will always kick you the real deal.",
      metadata: { icon: "electric_bolt", priority: "medium" as const },
    }),
  ]);

  const created = results.filter(
    (r) => r.status === "fulfilled" && r.value != null,
  ).length;

  return NextResponse.json({
    ok: true,
    created,
    total: results.length,
  });
}
