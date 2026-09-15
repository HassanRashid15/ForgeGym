import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/integrations/supabase/types";
import { jsonError } from "@/lib/api/errors";

/**
 * Server-side Supabase client for Route Handlers (Bearer JWT → RLS as that user).
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

/** Cookie-backed SSR client for Server Components / Route Handlers. */
export async function createSupabaseCookieClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — middleware/proxy will refresh cookies
          }
        },
      },
    },
  );
}

/** Service-role client (bypasses RLS). Optional — only if SUPABASE_SERVICE_ROLE_KEY is set. */
export function createSupabaseServiceClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;

  return createClient<Database>(url, serviceKey, {
    global: {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
      },
    },
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
 * Validate Bearer JWT (preferred for API) or fall back to cookie session.
 * Invalid/stale Bearer must not block cookie auth (common after env/server switch).
 */
export async function requireAuth(
  request: Request,
): Promise<AuthedContext | { error: ReturnType<typeof jsonError> }> {
  const accessToken = getBearerToken(request);

  if (accessToken) {
    const supabase = createSupabaseServerClient(accessToken);
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (!error && data.user) {
      return { supabase, user: data.user, accessToken };
    }
    // Stale/wrong-project token — try cookies next
  }

  // Cookie session fallback (SSR / middleware-aligned)
  try {
    const cookieClient = await createSupabaseCookieClient();
    const { data, error } = await cookieClient.auth.getUser();
    if (error || !data.user) {
      return {
        error: jsonError("Unauthorized", 401, {
          hint: "Missing access token. Please log in again.",
        }),
      };
    }

    const { data: sessionData } = await cookieClient.auth.getSession();
    const token = sessionData.session?.access_token || accessToken || "";
    return {
      supabase: cookieClient as unknown as SupabaseClient<Database>,
      user: data.user,
      accessToken: token,
    };
  } catch {
    return {
      error: jsonError("Unauthorized", 401, {
        hint: "Missing access token. Please log in again.",
      }),
    };
  }
}
