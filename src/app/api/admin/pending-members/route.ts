import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";

async function requireApprovedAdmin(request: Request) {
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
    .select("admin_approved, is_super_admin, email, gym_owner_id, gym_name, gym_city")
    .eq("user_id", user.id)
    .maybeSingle();

  const email = (profile?.email || user.email || "").toLowerCase();
  const isSuperAdmin =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true ||
    email === "superadmin@forge.test";

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
  const gymName = (profile as { gym_name?: string | null } | null)?.gym_name || null;
  const gymCity = (profile as { gym_city?: string | null } | null)?.gym_city || null;

  return {
    supabase: service,
    user,
    isSuperAdmin,
    gymOwnerId,
    gymName,
    gymCity,
  };
}

/** GET /api/admin/pending-members — Get pending members for approval (optimized for polling) */
export async function GET(request: Request) {
  const auth = await requireApprovedAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase, gymOwnerId } = auth;

  // Query for pending members - users who need admin approval
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("gym_owner_id", gymOwnerId)
    .eq("admin_approved", false)
    .not("approval_requested_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const userIds = (profiles || []).map((p) => p.user_id).filter(Boolean);
  
  // Get roles for these users
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const rolesByUser = new Map<string, string>();
  for (const row of roleRows || []) {
    rolesByUser.set(row.user_id, row.role);
  }

  // Filter to only show users (not staff/trainers/admins)
  const pendingMembers = (profiles || [])
    .filter((p) => rolesByUser.get(p.user_id) === "user")
    .map((p) => ({
      user_id: p.user_id,
      full_name: p.full_name,
      email: p.email,
      phone: p.phone,
      avatar_url: p.avatar_url,
      created_at: p.created_at,
      account_status: p.account_status,
      membership_type: p.membership_type,
    }));

  return NextResponse.json({
    pendingMembers,
    count: pendingMembers.length,
    timestamp: new Date().toISOString(),
  });
}