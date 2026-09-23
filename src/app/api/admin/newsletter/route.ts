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

/** GET /api/admin/newsletter — list subscribers (super admin) */
export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase } = auth;

  // Prefer RPC when present; fall back to table read via service role
  const rpc = await (supabase.rpc as any)("get_newsletter_subscriptions");
  if (!rpc.error && Array.isArray(rpc.data)) {
    return NextResponse.json({
      success: true,
      subscriptions: rpc.data,
      total: rpc.data.length,
    });
  }

  const { data, error } = await supabase
    .from("newsletter_subscriptions" as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error:
          rpc.error?.message ||
          error.message ||
          "Failed to fetch newsletter subscriptions",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    subscriptions: data || [],
    total: (data || []).length,
  });
}

/** DELETE /api/admin/newsletter — unsubscribe by email (super admin) */
export async function DELETE(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase } = auth;
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    reason?: string;
  } | null;

  const email = String(body?.email || "")
    .trim()
    .toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const rpc = await (supabase.rpc as any)("unsubscribe_from_newsletter", {
    p_email: email,
    p_reason: body?.reason || null,
  });

  if (!rpc.error) {
    return NextResponse.json({
      success: true,
      message: "User unsubscribed successfully",
    });
  }

  const { error } = await supabase
    .from("newsletter_subscriptions" as any)
    .update({
      is_active: false,
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_reason: body?.reason || null,
    } as never)
    .eq("email", email);

  if (error) {
    return NextResponse.json(
      { error: rpc.error?.message || error.message || "Failed to unsubscribe" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "User unsubscribed successfully",
  });
}
