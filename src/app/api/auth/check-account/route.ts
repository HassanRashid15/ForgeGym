import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** POST /api/auth/check-account */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim()?.toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await (supabase.rpc as any)("check_user_exists", {
    check_email: email,
  });

  if (error) {
    // RPC missing / failed — do not invent a false negative
    return NextResponse.json({ exists: null });
  }

  return NextResponse.json({ exists: typeof data === "boolean" ? data : null });
}
