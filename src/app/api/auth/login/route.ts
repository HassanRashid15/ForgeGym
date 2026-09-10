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

  // Admins must be approved by a super admin before they can use the app
  const userId = data.user.id;
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (roleData?.role === "admin") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("admin_approved")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile?.admin_approved !== true) {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error: "Your admin account is pending super admin approval",
          code: "admin_approval_pending",
        },
        { status: 403 },
      );
    }
  }

  return NextResponse.json({
    user: data.user,
    session: data.session,
  });
}
