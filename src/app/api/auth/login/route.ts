import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** POST /api/auth/login */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim()?.toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Email not confirmed", code: "email_not_confirmed" },
      { status: 403 },
    );
  }

  const userId = data.user.id;

  const { data: accessProfile } = await supabase
    .from("profiles")
    .select("login_enabled, admin_approved, gym_owner_id")
    .eq("user_id", userId)
    .maybeSingle();

  if ((accessProfile as { login_enabled?: boolean | null } | null)?.login_enabled === false) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error: "This staff account does not have login access",
        code: "login_disabled",
      },
      { status: 403 },
    );
  }

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  const role = roleData?.role;
  const gymOwnerId = (accessProfile as { gym_owner_id?: string | null } | null)?.gym_owner_id;
  const isApproved = accessProfile?.admin_approved === true;

  // Gym owners need super-admin approval before signing in
  if (role === "admin" && !isApproved) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error: "Your admin account is pending super admin approval",
        code: "admin_approval_pending",
      },
      { status: 403 },
    );
  }

  // Customers joining a gym need that gym admin's approval
  if (role === "user" && gymOwnerId && !isApproved) {
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error: "Your membership is pending gym admin approval",
        code: "member_approval_pending",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    user: data.user,
    session: data.session,
  });
}
