import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** POST /api/auth/check-verified */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim()?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
    "check_user_verified",
    { user_email: email },
  );

  if (!rpcError && typeof rpcData === "boolean") {
    return NextResponse.json({ verified: rpcData });
  }

  // Fallback probe: invalid password tells us if email is confirmed
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: "__probe_verification_check_only__",
  });

  if (authError) {
    const msg = authError.message.toLowerCase();
    if (msg.includes("email not confirmed")) {
      return NextResponse.json({ verified: false });
    }
    if (msg.includes("invalid login credentials")) {
      return NextResponse.json({ verified: true });
    }
  }

  return NextResponse.json({ verified: false });
}
