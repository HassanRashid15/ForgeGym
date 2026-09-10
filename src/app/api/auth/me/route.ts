import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";

/** GET /api/auth/me — read-only role + profile (no writes) */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user, supabase } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const [{ data: roles }, { data: profile }] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", user.id),
    db
      .from("profiles")
      .select("full_name, email, admin_approved, avatar_url, is_super_admin")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const roleNames = (roles || []).map((r) => r.role);
  let role: "admin" | "moderator" | "customer" = "customer";
  if (roleNames.includes("admin")) role = "admin";
  else if (roleNames.includes("moderator")) role = "moderator";

  const email = (profile?.email || user.email || "").toLowerCase();
  let isSuperAdmin = (profile as any)?.is_super_admin === true;

  // Seeded platform account — treat as super admin without writing on every request
  if (email === "superadmin@forge.test") {
    isSuperAdmin = true;
    role = "admin";
  }

  return NextResponse.json({
    id: user.id,
    email: profile?.email || user.email,
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      email.split("@")[0],
    role,
    isSuperAdmin,
    admin_approved:
      isSuperAdmin || profile?.admin_approved !== false,
    avatar:
      (profile as any)?.avatar_url || user.user_metadata?.avatar_url || null,
  });
}
