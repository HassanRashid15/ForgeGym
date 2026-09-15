import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  // Check if we have auth cookies before making Supabase call
  const hasAuthCookies = request.cookies.has('sb-access-token') || request.cookies.has('sb-refresh-token');
  
  // If no auth cookies and trying to access protected routes, redirect immediately
  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith("/dashboard") || path.startsWith("/profile");
  
  if (isProtected && !hasAuthCookies) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  // If no auth cookies and on login/register pages, proceed without auth check
  if ((path === "/login" || path === "/register") && !hasAuthCookies) {
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    if ((path === "/login" || path === "/register") && user) {
      const dest = request.nextUrl.clone();
      if (unverified) {
        dest.pathname = "/verification";
        dest.search = user.email
          ? `?email=${encodeURIComponent(user.email)}`
          : "";
      } else {
        dest.pathname = "/dashboard";
        dest.search = "";
      }
      return NextResponse.redirect(dest);
    }

    return response;
  } catch (error) {
    // If there's an auth error (rate limit, invalid token, etc.), log it and proceed
    // This prevents the middleware from breaking due to Supabase rate limits
    console.error('Proxy auth error:', error);
    
    // If protected route and we got an error, redirect to login as a safety measure
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
