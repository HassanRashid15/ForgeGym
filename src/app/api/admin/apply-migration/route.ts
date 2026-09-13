import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";

/**
 * POST /api/admin/apply-migration
 * Disabled for safety — run SQL from supabase/migrations in the Supabase SQL Editor.
 * Only the seeded/platform super admin may call this, and only in development.
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "Migration endpoint is disabled in production. Apply SQL via Supabase migrations.",
      },
      { status: 403 },
    );
  }

  const { user } = auth;
  const service = createSupabaseServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service client not available" }, { status: 500 });
  }

  const [{ data: roles }, { data: profile }] = await Promise.all([
    service.from("user_roles").select("role").eq("user_id", user.id),
    service
      .from("profiles")
      .select("is_super_admin, email")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const email = (profile?.email || user.email || "").toLowerCase();
  const isSuperAdmin =
    profile?.is_super_admin === true || email === "superadmin@forge.test";
  const isAdmin = (roles || []).some((r) => r.role === "admin");

  if (!isAdmin || !isSuperAdmin) {
    return NextResponse.json(
      { error: "Super admin privileges required" },
      { status: 403 },
    );
  }

  return NextResponse.json(
    {
      error:
        "Use the SQL Editor with supabase/migrations/*.sql instead of this endpoint.",
      hint: "This route no longer executes DDL over the service role.",
    },
    { status: 410 },
  );
}
