/**
 * Canonical public site URL for email verification redirects.
 * Skips broken / localhost values on Vercel so live register/verify works.
 */
function normalizeSiteUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return null;
  if (/^https?:\/\/localhost:$/i.test(trimmed)) return null;

  try {
    const url = new URL(trimmed);
    if (!url.hostname) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

export function resolveSiteUrl(request?: Request): string {
  const isVercelProd =
    process.env.VERCEL_ENV === "production" ||
    (process.env.VERCEL === "1" && process.env.NODE_ENV === "production");

  const forwardedHost = request?.headers.get("x-forwarded-host");
  const forwardedProto =
    request?.headers.get("x-forwarded-proto") ||
    (forwardedHost ? "https" : null);

  const candidates: Array<string | null | undefined> = [
    process.env.NEXT_PUBLIC_SITE_URL,
    request?.headers.get("origin"),
    forwardedHost && forwardedProto
      ? `${forwardedProto}://${forwardedHost}`
      : null,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ];

  for (const raw of candidates) {
    const url = normalizeSiteUrl(raw);
    if (!url) continue;
    if (isVercelProd && isLocalhostUrl(url)) continue;
    return url;
  }

  return "http://localhost:3000";
}

export function verificationRedirectUrl(email: string, request?: Request): string {
  const siteUrl = resolveSiteUrl(request);
  return `${siteUrl}/verification?email=${encodeURIComponent(email)}`;
}
