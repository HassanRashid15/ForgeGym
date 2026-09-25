/** Shared cookie name/value for home splash (client + server safe). */

export const SPLASH_SEEN_COOKIE = "forge_splash_seen";
export const SPLASH_SEEN_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function splashSeenCookieScript(): string {
  return `${SPLASH_SEEN_COOKIE}=1; Path=/; Max-Age=${SPLASH_SEEN_MAX_AGE}; SameSite=Lax`;
}

export function hasSplashSeenCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader
    .split(";")
    .some((c) => c.trim().startsWith(`${SPLASH_SEEN_COOKIE}=1`));
}
