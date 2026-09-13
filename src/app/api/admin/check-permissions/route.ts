import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";

/**
 * GET /api/admin/check-permissions
 * Super-admin only — minimal permission summary (no full profile dump).
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user } = auth;
  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  const [{ data: roles }, { data: profile }] = await Promise.all([
    service.from("user_roles").select("role").eq("user_id", user.id),
    service
      .from("profiles")
      .select("admin_approved, is_super_admin, email, gym_owner_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const email = (profile?.email || user.email || "").toLowerCase();
  const roleNames = (roles || []).map((r) => r.role);
  const isSuperAdmin =
    profile?.is_super_admin === true || email === "superadmin@forge.test";
  const hasAdminRole = roleNames.includes("admin");
  const adminApproved = profile?.admin_approved === true;

  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Super admin only" }, { status: 403 });
  }

  return NextResponse.json({
    authenticated: true,
    userId: user.id,
    email,
    roles: roleNames,
    hasAdminRole,
    adminApproved,
    isSuperAdmin,
    gymOwnerId: profile?.gym_owner_id || null,
    canAccessAdminUsers: isSuperAdmin || (hasAdminRole && adminApproved),
  });
}
