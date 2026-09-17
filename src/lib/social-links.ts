/** Optional public social profile URLs stored on profiles. */
export type TrainerSocialLinks = {
  instagramUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
};

export const SOCIAL_LINK_FIELDS = [
  {
    key: "instagram_url" as const,
    camel: "instagramUrl" as const,
    label: "Instagram",
    placeholder: "https://instagram.com/username",
  },
  {
    key: "facebook_url" as const,
    camel: "facebookUrl" as const,
    label: "Facebook",
    placeholder: "https://facebook.com/username",
  },
  {
    key: "twitter_url" as const,
    camel: "twitterUrl" as const,
    label: "X / Twitter",
    placeholder: "https://x.com/username",
  },
  {
    key: "youtube_url" as const,
    camel: "youtubeUrl" as const,
    label: "YouTube",
    placeholder: "https://youtube.com/@channel",
  },
  {
    key: "tiktok_url" as const,
    camel: "tiktokUrl" as const,
    label: "TikTok",
    placeholder: "https://tiktok.com/@username",
  },
];

export type SocialLinkDbKey = (typeof SOCIAL_LINK_FIELDS)[number]["key"];

/** Trim and ensure http(s) scheme; empty → null. */
export function normalizeSocialUrl(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export function pickSocialLinksFromRow(row: Record<string, unknown>): TrainerSocialLinks {
  return {
    instagramUrl: normalizeSocialUrl(row.instagram_url),
    facebookUrl: normalizeSocialUrl(row.facebook_url),
    twitterUrl: normalizeSocialUrl(row.twitter_url),
    youtubeUrl: normalizeSocialUrl(row.youtube_url),
    tiktokUrl: normalizeSocialUrl(row.tiktok_url),
  };
}

export function socialLinksPresent(links: TrainerSocialLinks): boolean {
  return Object.values(links).some(Boolean);
}
