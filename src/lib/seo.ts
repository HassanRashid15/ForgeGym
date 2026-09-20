import type { Metadata } from "next";
import { resolveSiteUrl } from "@/lib/site-url";

export const SITE_NAME = "Forge Gym";
export const SITE_TAGLINE =
  "Partner gyms, expert trainers, and a community that refuses to quit.";

/** Default <title> — keep under ~60 chars for SERP display. */
export const SITE_SEO_TITLE = "Forge Gym — Partner Gyms & Expert Trainers";

export const DEFAULT_DESCRIPTION =
  "Discover partner gyms on Forge — train with real coaches, track progress, and grow with a platform built for the floor.";

export function getMetadataBase(): URL {
  return new URL(resolveSiteUrl());
}

/** Browser / OG title with brand when absolute control is needed. */
export function brandedTitle(segment: string): string {
  const clean = segment.replace(/\s+/g, " ").trim();
  if (!clean) return SITE_SEO_TITLE;
  if (clean === SITE_NAME || clean.startsWith(`${SITE_NAME} `) || clean.startsWith(`${SITE_NAME}—`) || clean.startsWith(`${SITE_NAME} -`)) {
    return clean;
  }
  return `${clean} | ${SITE_NAME}`;
}

/** Dynamic gym profile title, e.g. "Pulse Fitness in Lahore". */
export function gymSeoTitle(name: string, city?: string | null): string {
  const gym = name.replace(/\s+/g, " ").trim() || "Partner Gym";
  const place = city?.replace(/\s+/g, " ").trim();
  return place ? `${gym} in ${place}` : gym;
}

/** Dynamic trainer profile title. */
export function trainerSeoTitle(
  name: string,
  specialization?: string | null,
  gymName?: string | null,
): string {
  const who = name.replace(/\s+/g, " ").trim() || "Personal Trainer";
  const spec = specialization?.replace(/\s+/g, " ").trim();
  if (spec) return `${who} — ${spec}`;
  const gym = gymName?.replace(/\s+/g, " ").trim();
  if (gym) return `${who} — Trainer at ${gym}`;
  return `${who} — Personal Trainer`;
}

type BuildPageMetadataInput = {
  title: string;
  description?: string;
  path?: string;
  image?: string | null;
  noIndex?: boolean;
  /** When true, title is used as-is (no root template suffix). */
  absoluteTitle?: boolean;
};

/** Shared Metadata builder for marketing + detail pages. */
export function buildPageMetadata({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image,
  noIndex = false,
  absoluteTitle = false,
}: BuildPageMetadataInput): Metadata {
  const base = getMetadataBase();
  const canonical = new URL(path.startsWith("/") ? path : `/${path}`, base).toString();
  const ogImage = image
    ? image.startsWith("http")
      ? image
      : new URL(image, base).toString()
    : new URL("/opengraph-image", base).toString();

  const displayTitle = absoluteTitle ? title : title;
  const socialTitle = absoluteTitle ? title : brandedTitle(title);

  return {
    title: absoluteTitle ? { absolute: displayTitle } : displayTitle,
    description,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: canonical,
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: socialTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: { index: false, follow: false },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

/** JSON-LD helper — stringify safely for <script type="application/ld+json"> */
export function jsonLdScript(data: Record<string, unknown> | Record<string, unknown>[]) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}

export function organizationJsonLd() {
  const base = getMetadataBase().toString().replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: base,
    logo: `${base}/favicon/android-chrome-512x512.png`,
    description: DEFAULT_DESCRIPTION,
  };
}

export function websiteJsonLd() {
  const base = getMetadataBase().toString().replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: base,
    potentialAction: {
      "@type": "SearchAction",
      target: `${base}/gyms?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function localGymJsonLd(input: {
  name: string;
  description?: string | null;
  city?: string | null;
  url: string;
  image?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HealthClub",
    name: input.name,
    description: input.description || undefined,
    url: input.url,
    image: input.image || undefined,
    address: input.city
      ? {
          "@type": "PostalAddress",
          addressLocality: input.city,
        }
      : undefined,
  };
}

export function personTrainerJsonLd(input: {
  name: string;
  description?: string | null;
  url: string;
  image?: string | null;
  jobTitle?: string | null;
  worksFor?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    description: input.description || undefined,
    url: input.url,
    image: input.image || undefined,
    jobTitle: input.jobTitle || "Personal Trainer",
    worksFor: input.worksFor
      ? { "@type": "Organization", name: input.worksFor }
      : undefined,
  };
}
