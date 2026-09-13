import { NextResponse } from "next/server";
import {
  createSupabaseCookieClient,
  createSupabaseServerClient,
  getBearerToken,
} from "@/lib/supabase/server";

/** POST /api/auth/logout */
export async function POST(request: Request) {
  const token = getBearerToken(request);

  try {
    const cookieClient = await createSupabaseCookieClient();
    await cookieClient.auth.signOut();
  } catch {
    // ignore cookie clear failures
  }

  if (token) {
    const supabase = createSupabaseServerClient(token);
    await supabase.auth.signOut();
  }

  return NextResponse.json({ ok: true });
}
