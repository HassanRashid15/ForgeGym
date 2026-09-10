import { NextResponse } from "next/server";
import { createSupabaseServerClient, getBearerToken } from "@/lib/supabase/server";

/** POST /api/auth/logout */
export async function POST(request: Request) {
  const token = getBearerToken(request);
  const supabase = createSupabaseServerClient(token);

  // Best-effort server revoke; client always clears local session too
  if (token) {
    await supabase.auth.getUser(token);
  }
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
