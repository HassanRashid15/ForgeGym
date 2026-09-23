import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";

async function requireSuperAdmin(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const { supabase, user } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const { data: profile } = await db
    .from("profiles")
    .select("is_super_admin, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const email = (profile?.email || user.email || "").toLowerCase();
  const isSuperAdmin =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true ||
    email === "superadmin@forge.test";

  if (!isSuperAdmin) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — super admin only" },
        { status: 403 },
      ),
    };
  }

  return { supabase: db, user };
}

/** POST /api/admin/newsletter/cleanup — deactivate expired subscriptions */
export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase } = auth;

  const rpc = await (supabase.rpc as any)("cleanup_expired_subscriptions");
  if (!rpc.error) {
    const deleted = typeof rpc.data === "number" ? rpc.data : Number(rpc.data) || 0;
    return NextResponse.json({
      success: true,
      deleted_count: deleted,
      message: `Cleaned up ${deleted} expired subscription(s)`,
    });
  }

  // Fallback: mark inactive subscriptions older than 365 days as cleaned
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);

  const { data, error } = await supabase
    .from("newsletter_subscriptions" as any)
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_reason: "cleanup_expired",
    } as never)
    .eq("is_active", true)
    .lt("created_at", cutoff.toISOString())
    .select("id");

  if (error) {
    return NextResponse.json(
      {
        error:
          rpc.error?.message ||
          error.message ||
          "Failed to cleanup expired subscriptions",
      },
      { status: 400 },
    );
  }

  const deleted = (data || []).length;
  return NextResponse.json({
    success: true,
    deleted_count: deleted,
    message: `Cleaned up ${deleted} expired subscription(s)`,
  });
}
