import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { CacheTTL } from "@/lib/api-cache";

/** Supabase SSR cookies look like `sb-<ref>-auth-token` (not legacy sb-access-token). */
function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.startsWith("sb-") &&
        (c.name.includes("auth-token") || c.name.includes("access-token")),
    );
}

/** Short-lived getUser cache — avoids re-hitting Supabase Auth on every /dashboard nav */
const authUserCache = new Map<string, { user: User; at: number }>();

function getCachedAuthUser(accessToken: string): User | null {
  const hit = authUserCache.get(accessToken);
  if (!hit) return null;
  if (Date.now() - hit.at >= CacheTTL.authUser) {
    authUserCache.delete(accessToken);
    return null;
  }
  return hit.user;
}

function setCachedAuthUser(accessToken: string, user: User) {
  if (authUserCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of authUserCache) {
      if (now - v.at >= CacheTTL.authUser) authUserCache.delete(k);
    }
  }
  authUserCache.set(accessToken, { user, at: Date.now() });
}

/**
 * Next.js 16 proxy (formerly middleware) — refreshes auth cookies and
 * gates /dashboard + /profile behind a verified session.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith("/dashboard") || path.startsWith("/profile");
  const isAuthPage = path === "/login" || path === "/register";
  const hasAuthCookies = hasSupabaseAuthCookie(request);

  // Fast path: no cookies on protected route → login
  if (isProtected && !hasAuthCookies) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  // Fast path: no cookies on login/register → allow through (skip getUser)
  if (isAuthPage && !hasAuthCookies) {
    return response;
  }

  try {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Prefer local JWT session; only call Auth network when cache misses
    const {
      data: { session },
    } = await supabase.auth.getSession();

    let user: User | null = null;
    if (session?.access_token) {
      user = getCachedAuthUser(session.access_token);
      if (!user) {
        const {
          data: { user: fresh },
        } = await supabase.auth.getUser();
        user = fresh;
        if (user) setCachedAuthUser(session.access_token, user);
      }
    } else {
      const {
        data: { user: fresh },
      } = await supabase.auth.getUser();
      user = fresh;
    }

    const isVerified = !!user?.email_confirmed_at;
    const unverified = !!user && !isVerified;

    if (isProtected && unverified) {
      const verificationUrl = request.nextUrl.clone();
      verificationUrl.pathname = "/verification";
      verificationUrl.search = user.email
        ? `?email=${encodeURIComponent(user.email)}`
        : "";
      return NextResponse.redirect(verificationUrl);
    }

    if (isProtected && !user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }

    // Already signed in on login/register → send to dashboard (or verification)
    if (isAuthPage && user) {
      // Allow staying on login right after email verification (manual sign-in)
      if (path === "/login" && request.nextUrl.searchParams.get("verified") === "true") {
        return response;
      }

      const dest = request.nextUrl.clone();
      if (unverified) {
        dest.pathname = "/verification";
        dest.search = user.email
          ? `?email=${encodeURIComponent(user.email)}`
          : "";
      } else {
        const redirectTo = request.nextUrl.searchParams.get("redirect");
        dest.pathname =
          redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
            ? redirectTo
            : "/dashboard";
        dest.search = "";
      }
      return NextResponse.redirect(dest);
    }

    return response;
  } catch (error) {
    console.error("Proxy auth error:", error);

    if (isProtected) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }

    return response;
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/login",
    "/register",
  ],
};
