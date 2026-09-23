/**
 * Public contact details for /contact.
 * Prefer NEXT_PUBLIC_* env; API may overlay platform_settings when present.
 */
export type SiteContactInfo = {
  addressLines: string[];
  phones: string[];
  emails: string[];
  hours: string[];
  mapEmbedUrl: string;
  supportEmail: string;
  primaryPhone: string;
};

function splitLines(raw: string | undefined, fallback: string[]): string[] {
  if (!raw?.trim()) return fallback;
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getDefaultSiteContact(): SiteContactInfo {
  const emails = splitLines(process.env.NEXT_PUBLIC_CONTACT_EMAILS, [
    "hello@forgegym.app",
    "support@forgegym.app",
  ]);
  const phones = splitLines(process.env.NEXT_PUBLIC_CONTACT_PHONES, [
    "+92 300 0000000",
  ]);

  return {
    addressLines: splitLines(process.env.NEXT_PUBLIC_CONTACT_ADDRESS, [
      "Forge Gym Platform",
      "Partner gyms across Pakistan",
    ]),
    phones,
    emails,
    hours: splitLines(process.env.NEXT_PUBLIC_CONTACT_HOURS, [
      "Support: Mon–Sat 9am – 8pm",
      "Partner gyms: hours vary by location",
    ]),
    mapEmbedUrl:
      process.env.NEXT_PUBLIC_CONTACT_MAP_EMBED?.trim() ||
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3403.0!2d74.3587!3d31.5204!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzHCsDMxJzEzLjQiTiA3NMKwMjEnMzEuMyJF!5e0!3m2!1sen!2s!4v1",
    supportEmail: emails[0] || "hello@forgegym.app",
    primaryPhone: phones[0] || "+92 300 0000000",
  };
}

export function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
