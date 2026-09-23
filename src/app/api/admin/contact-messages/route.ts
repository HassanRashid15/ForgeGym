import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";

async function requireAdminViewer(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const service = createSupabaseServiceClient();
  if (!service) {
    return { error: jsonError("Server misconfigured", 500) };
  }

  const [{ data: roleRows }, { data: profile }] = await Promise.all([
    service.from("user_roles").select("role").eq("user_id", auth.user.id),
    service
      .from("profiles")
      .select("admin_approved, is_super_admin, email")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
  ]);

  const isAdmin = (roleRows || []).some((r) => r.role === "admin");
  const email = (
    (profile as { email?: string } | null)?.email ||
    auth.user.email ||
    ""
  ).toLowerCase();
  const isSuper =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true ||
    email === "superadmin@forge.test";

  if (!isAdmin && !isSuper) {
    return { error: jsonError("Forbidden", 403) };
  }

  if (
    !isSuper &&
    (profile as { admin_approved?: boolean } | null)?.admin_approved !== true
  ) {
    return { error: jsonError("Forbidden — admin not approved", 403) };
  }

  return { service, user: auth.user, isSuper };
}

/** GET /api/admin/contact-messages — inbox from /contact form */
export async function GET(request: Request) {
  const auth = await requireAdminViewer(request);
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status"); // new | read | all
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") || "30", 10) || 30, 1),
    100,
  );

  let query = auth.service
    .from("contact_messages" as never)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status === "new" || status === "read" || status === "replied" || status === "archived") {
    query = query.eq("status", status);
  } else if (status !== "all") {
    // Default: actionable inbox
    query = query.in("status", ["new", "read"]);
  }

  const { data, error } = await query;
  if (error) return jsonError(error.message, 400);

  const { count: newCount } = await auth.service
    .from("contact_messages" as never)
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  return NextResponse.json({
    messages: data || [],
    newCount: newCount ?? 0,
  });
}

/** PATCH /api/admin/contact-messages — mark read / archive */
export async function PATCH(request: Request) {
  const auth = await requireAdminViewer(request);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Invalid body", 400);

  const { id, status } = body as { id?: string; status?: string };
  if (!id || typeof id !== "string") return jsonError("id is required", 400);

  const allowed = ["new", "read", "replied", "archived"];
  if (!status || !allowed.includes(status)) {
    return jsonError("status must be new|read|replied|archived", 400);
  }

  const { data, error } = await auth.service
    .from("contact_messages" as never)
    .update({ status } as never)
    .eq("id", id)
    .select()
    .single();

  if (error) return jsonError(error.message, 400);
  return NextResponse.json({ success: true, message: data });
}
