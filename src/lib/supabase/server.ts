import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { NextResponse } from "next/server";

/**
 * Server-side Supabase client for Route Handlers.
 * Pass the caller's JWT so RLS applies as that user.
 */
export function createSupabaseServerClient(accessToken?: string | null): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient<Database>(url, anonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** Service-role client (bypasses RLS). Optional — only if SUPABASE_SERVICE_ROLE_KEY is set. */
export function createSupabaseServiceClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim() || null;
}

export type AuthedContext = {
  supabase: SupabaseClient<Database>;
  user: User;
  accessToken: string;
};

/**
 * Validate Bearer JWT and return a user-scoped Supabase client.
 * Uses getUser(jwt) — more reliable than relying on header-only session state.
 */
export async function requireAuth(
  request: Request,
): Promise<AuthedContext | { error: NextResponse }> {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized", hint: "Missing access token. Please log in again." },
        { status: 401 },
      ),
    };
  }

  const supabase = createSupabaseServerClient(accessToken);

  // Pass JWT explicitly so validation does not depend on an in-memory server session
  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized", hint: error?.message || "Invalid or expired session" },
        { status: 401 },
      ),
    };
  }

  return { supabase, user: data.user, accessToken };
}
