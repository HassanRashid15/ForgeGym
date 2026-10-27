import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient, requireAuth } from "@/lib/supabase/server";

/**
 * Middleware helper to verify authentication
 * Returns { error, supabase, user } or { error }
 */
export async function verifyAuth(request: Request) {
  return await requireAuth(request);
}

/**
 * Middleware helper to verify admin role
 * Returns { error, supabase, user, isAdmin } or { error }
 */
export async function verifyAdmin(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const { supabase, user } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const { data: roleRows } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdmin = (roleRows || []).some((r) => r.role === "admin");
  if (!isAdmin) {
    return {
      error: NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 }),
    };
  }

  return { supabase: db, user, isAdmin };
}

/**
 * Middleware helper to verify super admin role
 * Returns { error, supabase, user, isSuperAdmin } or { error }
 */
export async function verifySuperAdmin(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const { supabase, user } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const { data: roleRows } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdmin = (roleRows || []).some((r) => r.role === "admin");
  if (!isAdmin) {
    return {
      error: NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 }),
    };
  }

  const { data: profile } = await db
    .from("profiles")
    .select("admin_approved, is_super_admin, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true;

  if (!isSuperAdmin) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — super admin only" },
        { status: 403 },
      ),
    };
  }

  return { supabase: db, user, isSuperAdmin };
}

/**
 * Middleware helper to verify approved gym admin
 * Returns { error, supabase, user, isSuperAdmin, gymOwnerId, gymName, gymCity } or { error }
 */
export async function verifyApprovedAdmin(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const { supabase, user } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const { data: roleRows } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdmin = (roleRows || []).some((r) => r.role === "admin");
  if (!isAdmin) {
    return {
      error: NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 }),
    };
  }

  const { data: profile } = await db
    .from("profiles")
    .select("admin_approved, is_super_admin, email, gym_owner_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperAdmin =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true;

  if (!isSuperAdmin && !profile?.admin_approved) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — your admin account is not approved yet" },
        { status: 403 },
      ),
    };
  }

  if (!service) {
    return {
      error: NextResponse.json(
        { error: "Server misconfigured — missing service role key" },
        { status: 500 },
      ),
    };
  }

  const gymOwnerId =
    (profile as { gym_owner_id?: string | null } | null)?.gym_owner_id || user.id;
  const { data: gymRow } = await db
    .from("gyms")
    .select("name, city")
    .eq("owner_user_id", gymOwnerId)
    .maybeSingle();
  const gymName = (gymRow as { name?: string | null } | null)?.name || null;
  const gymCity = (gymRow as { city?: string | null } | null)?.city || null;

  return {
    supabase: service,
    user,
    isSuperAdmin,
    gymOwnerId,
    gymName,
    gymCity,
  };
}

/**
 * Standard error response helper
 */
export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standard success response helper
 */
export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}
