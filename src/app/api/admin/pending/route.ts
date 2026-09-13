import { NextResponse } from "next/server";
import { createSupabaseServiceClient, requireAuth } from "@/lib/supabase/server";
import { notify } from "@/lib/notify-actions";

async function requireSuperAdmin(request: Request) {
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

  const email = (profile?.email || user.email || "").toLowerCase();
  const isSuperAdmin =
    (profile as any)?.is_super_admin === true || email === "superadmin@forge.test";

  if (!isSuperAdmin) {
    return {
      error: NextResponse.json(
        { error: "Forbidden — super admin only" },
        { status: 403 },
      ),
    };
  }

  if (!profile?.admin_approved && email !== "superadmin@forge.test") {
    return {
      error: NextResponse.json(
        { error: "Forbidden — your admin account is not approved yet" },
        { status: 403 },
      ),
    };
  }

  return { supabase: db, user };
}

function mapAdmin(p: any) {
  const approved = p.admin_approved === true;
  const rejected = !approved && !!p.admin_rejected_at;
  const status = approved ? "approved" : rejected ? "rejected" : "pending";

  return {
    user_id: p.user_id as string,
    full_name: (p.full_name as string | null) ?? null,
    email: (p.email as string | null) ?? null,
    phone: (p.phone as string | null) ?? null,
    created_at: (p.created_at as string | null) ?? null,
    admin_approved: approved,
    admin_rejected_at: (p.admin_rejected_at as string | null) ?? null,
    is_verified: p.is_verified === true,
    approval_requested_at: (p.approval_requested_at as string | null) ?? null,
    gym_name: (p.gym_name as string | null) ?? null,
    gym_type: (p.gym_type as string | null) ?? null,
    gym_city: (p.gym_city as string | null) ?? null,
    status: status as "pending" | "approved" | "rejected",
  };
}

/** GET /api/admin/pending — list pending, approved, and rejected gym-owner admins */
export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase } = auth;

  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");

  if (rolesError) {
    return NextResponse.json({ error: rolesError.message }, { status: 400 });
  }

  const adminIds = Array.from(new Set((roles || []).map((r) => r.user_id)));

  // Also include previously rejected admins who may have been demoted (older reject flow)
  const { data: rejectedOnly } = await supabase
    .from("profiles")
    .select("user_id")
    .not("admin_rejected_at", "is", null)
    .eq("admin_approved", false);

  for (const row of rejectedOnly || []) {
    if (row.user_id && !adminIds.includes(row.user_id)) {
      adminIds.push(row.user_id);
    }
  }

  if (adminIds.length === 0) {
    return NextResponse.json({
      pending: [],
      approved: [],
      rejected: [],
      admins: [],
      notifications: [],
    });
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .in("user_id", adminIds)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Gym-owner admins only — hide platform super admins from this list
  const admins = (profiles || [])
    .filter((p: any) => p.is_super_admin !== true)
    .map(mapAdmin);
  const pending = admins.filter((a) => a.status === "pending");
  const approved = admins.filter((a) => a.status === "approved");
  const rejected = admins.filter((a) => a.status === "rejected");

  const { data: notifications } = await supabase
    .from("admin_notifications" as any)
    .select("*")
    .eq("recipient_user_id", auth.user.id)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({
    pending,
    approved,
    rejected,
    admins,
    notifications: notifications || [],
  });
}

/** POST /api/admin/pending — approve or reject { userId, action } */
export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const body = await request.json().catch(() => null);
  const userId = body?.userId?.trim();
  const action = (body?.action === "reject" ? "reject" : "approve") as "approve" | "reject";

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json(
      { error: action === "reject" ? "Cannot reject yourself" : "Cannot approve yourself" },
      { status: 400 },
    );
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("is_super_admin, email")
    .eq("user_id", userId)
    .maybeSingle();

  if (
    (targetProfile as any)?.is_super_admin === true ||
    (targetProfile?.email || "").toLowerCase() === "superadmin@forge.test"
  ) {
    return NextResponse.json(
      { error: "Cannot modify a platform super admin" },
      { status: 400 },
    );
  }

  // Ensure admin role exists (needed to re-approve after older demote-reject)
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = (roleRows || []).map((r) => r.role);
  if (!roles.includes("admin")) {
    if (action === "approve") {
      const { error: roleErr } = await supabase.from("user_roles").upsert(
        { user_id: userId, role: "admin" } as any,
        { onConflict: "user_id,role" },
      );
      if (roleErr) {
        return NextResponse.json({ error: roleErr.message }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Target user is not an admin" }, { status: 400 });
    }
  }

  if (action === "approve") {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        admin_approved: true,
        admin_rejected_at: null,
        approval_requested_at: null,
        is_super_admin: false,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("user_id", userId)
      .select("user_id, full_name, email, admin_approved, admin_rejected_at")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    await supabase
      .from("admin_notifications" as any)
      .update({ read_at: new Date().toISOString() } as any)
      .eq("from_user_id", userId)
      .is("read_at", null);

    const { data: gymProfile } = await supabase
      .from("profiles")
      .select("gym_name")
      .eq("user_id", userId)
      .maybeSingle();
    void notify.gymOwnerApproved(
      userId,
      (gymProfile as { gym_name?: string | null } | null)?.gym_name,
    );

    return NextResponse.json({ approved: data, action: "approve" });
  }

  // Reject: keep admin role so they stay in the list and can be approved later
  const { data, error } = await supabase
    .from("profiles")
    .update({
      admin_approved: false,
      admin_rejected_at: new Date().toISOString(),
      approval_requested_at: null,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("user_id", userId)
    .select("user_id, full_name, email, admin_approved, admin_rejected_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase
    .from("admin_notifications" as any)
    .update({ read_at: new Date().toISOString() } as any)
    .eq("from_user_id", userId)
    .is("read_at", null);

  void notify.gymOwnerRejected(userId);

  return NextResponse.json({ rejected: data, action: "reject" });
}
