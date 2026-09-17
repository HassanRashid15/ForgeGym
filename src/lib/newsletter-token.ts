import { createHmac, timingSafeEqual } from "crypto";

function secret() {
  return (
    process.env.NEWSLETTER_UNSUB_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "forge-newsletter-dev-secret"
  );
}

/** Signed token so unsubscribe links cannot be forged for arbitrary emails. */
export function signNewsletterEmail(email: string): string {
  const clean = email.trim().toLowerCase();
  return createHmac("sha256", secret()).update(clean).digest("hex").slice(0, 32);
}

export function verifyNewsletterEmailToken(email: string, token: string): boolean {
  if (!email || !token || token.length < 16) return false;
  const expected = signNewsletterEmail(email);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(token);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function buildUnsubscribeUrl(email: string, siteBase?: string): string {
  const site =
    (siteBase || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") ||
    "https://forge.gym";
  const token = signNewsletterEmail(email);
  const params = new URLSearchParams({
    email: email.trim().toLowerCase(),
    token,
  });
  return `${site}/unsubscribe?${params.toString()}`;
}
