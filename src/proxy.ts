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

  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/dashboard") || path.startsWith("/profile");
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
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/login",
    "/register",
  ],
};
