import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { getPublicTrainerById, getGymTrainers } from "@/lib/gyms";
import {
  ArrowLeft,
  Award,
  Building2,
  Calendar,
  Dumbbell,
  Facebook,
  GraduationCap,
  Instagram,
  Languages,
  MapPin,
  Sparkles,
  Youtube,
} from "lucide-react";
import { getNameInitials } from "@/lib/utils";
import {
  buildPageMetadata,
  jsonLdScript,
  personTrainerJsonLd,
} from "@/lib/seo";
import { resolveSiteUrl } from "@/lib/site-url";
import { socialLinksPresent } from "@/lib/social-links";

export const revalidate = 30;

function listPublicValue(value?: string[] | string | null) {
  if (!value) return null;
  if (Array.isArray(value)) {
    const joined = value.filter(Boolean).join(", ");
    return joined || null;
  }
  return String(value) || null;
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gym?: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const dbTrainer = await getPublicTrainerById(id);
  if (!dbTrainer) {
    return buildPageMetadata({
      title: "Trainer Not Found",
      description: "This trainer is not available on Forge.",
      path: `/trainers/${id}`,
      noIndex: true,
    });
  }

  const name = dbTrainer.fullName || "Trainer";
  const description =
    dbTrainer.bio ||
    `${name}${dbTrainer.specialization ? ` — ${dbTrainer.specialization}` : ""}`;

  return buildPageMetadata({
    title: name,
    description,
    path: `/trainers/${id}`,
    image: dbTrainer.avatarUrl,
  });
}

export default async function TrainerDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { gym: gymQuery } = await searchParams;

  const dbTrainer = await getPublicTrainerById(id);
  if (!dbTrainer) {
    notFound();
  }

  const gymOwnerId = gymQuery || dbTrainer.gymOwnerId;
  const backHref = gymOwnerId ? `/gyms/${gymOwnerId}` : "/trainers";
  const backLabel = gymOwnerId
    ? dbTrainer.gymName
      ? `Back to ${dbTrainer.gymName}`
      : "Back to gym"
    : "Back to Trainers";

  const related = gymOwnerId
    ? (await getGymTrainers(gymOwnerId)).filter((t) => t.userId !== dbTrainer.userId).slice(0, 3)
    : [];

  const registerHref = gymOwnerId
    ? `/register?gym=${encodeURIComponent(gymOwnerId)}`
    : "/register";

  const heroImage = dbTrainer.avatarUrl;
  const pageUrl = `${resolveSiteUrl().replace(/\/$/, "")}/trainers/${id}`;
  const socials = [
    {
      label: "Instagram",
      href: dbTrainer.instagramUrl,
      icon: Instagram,
    },
    {
      label: "Facebook",
      href: dbTrainer.facebookUrl,
      icon: Facebook,
    },
    {
      label: "X / Twitter",
      href: dbTrainer.twitterUrl,
      icon: null,
    },
    {
      label: "YouTube",
      href: dbTrainer.youtubeUrl,
      icon: Youtube,
    },
    {
      label: "TikTok",
      href: dbTrainer.tiktokUrl,
      icon: null,
    },
  ].filter((s) => s.href);
  const hasSocials = socialLinksPresent({
    instagramUrl: dbTrainer.instagramUrl,
    facebookUrl: dbTrainer.facebookUrl,
    twitterUrl: dbTrainer.twitterUrl,
    youtubeUrl: dbTrainer.youtubeUrl,
    tiktokUrl: dbTrainer.tiktokUrl,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          personTrainerJsonLd({
            name: dbTrainer.fullName || "Trainer",
            description: dbTrainer.bio,
            url: pageUrl,
            image: dbTrainer.avatarUrl,
            jobTitle: dbTrainer.specialization,
            worksFor: dbTrainer.gymName,
          }),
        )}
      />
      <Navbar />

      <section className="relative pt-24">
        <div className="absolute inset-0 h-[42vh] overflow-hidden bg-muted">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage}
              alt={dbTrainer.fullName || "Trainer"}
              className="h-full w-full object-cover opacity-35"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        </div>

        <div className="container relative z-10 mx-auto px-4 pb-16 pt-28">
          <Link
            href={backHref}
            className="mb-8 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-primary text-2xl font-bold text-primary-foreground shadow-lg sm:size-32">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt={dbTrainer.fullName || "Trainer"}
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                getNameInitials(dbTrainer.fullName || "PT")
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-5xl tracking-normal md:text-7xl">
                {dbTrainer.fullName || "Trainer"}
              </h1>
              <p className="mt-2 text-lg font-semibold text-primary">
                {dbTrainer.specialization || "Personal trainer"}
              </p>
              {(dbTrainer.gymName || dbTrainer.gymCity) && (
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {dbTrainer.gymName && (
                    <Link
                      href={gymOwnerId ? `/gyms/${gymOwnerId}` : "#"}
                      className="inline-flex items-center gap-2 transition hover:text-foreground"
                    >
                      <span className="relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded bg-primary">
                        {dbTrainer.gymMainImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={dbTrainer.gymMainImageUrl}
                            alt={dbTrainer.gymName}
                            className="absolute inset-0 size-full object-cover"
                          />
                        ) : (
                          <Building2 className="h-3 w-3 text-primary-foreground" />
                        )}
                      </span>
                      {dbTrainer.gymName}
                    </Link>
                  )}
                  {dbTrainer.gymCity && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {dbTrainer.gymCity}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16">
        <div className="container mx-auto grid gap-12 px-4 lg:grid-cols-3">
          <div className="space-y-12 lg:col-span-2">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                {
                  icon: Award,
                  value: dbTrainer.yearsExperience,
                  label: "Experience",
                },
                {
                  icon: Calendar,
                  value: dbTrainer.workingDays,
                  label: "Working days",
                },
                {
                  icon: GraduationCap,
                  value: dbTrainer.education,
                  label: "Education",
                },
              ]
                .filter((s) => s.value)
                .map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-border bg-card p-5 text-center"
                  >
                    <s.icon className="mx-auto mb-2 h-7 w-7 text-primary" />
                    <div className="line-clamp-2 font-display text-lg tracking-normal">
                      {s.value}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
                About
              </p>
              <h2 className="font-display mb-4 text-3xl tracking-normal md:text-4xl">
                Meet {dbTrainer.fullName?.split(" ")[0] || "the trainer"}
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                {dbTrainer.bio ||
                  `${dbTrainer.fullName || "This trainer"} coaches at ${
                    dbTrainer.gymName || "this gym"
                  }${
                    dbTrainer.specialization
                      ? `, specializing in ${dbTrainer.specialization}`
                      : ""
                  }.`}
              </p>
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
                Coaching
              </p>
              <h2 className="font-display mb-4 text-3xl tracking-normal">Public profile</h2>
              <div className="space-y-0 overflow-hidden rounded-2xl border border-border bg-card text-sm">
                {(
                  [
                    ["Name", dbTrainer.fullName],
                    ["Specialization", dbTrainer.specialization],
                    ["Gym", dbTrainer.gymName],
                    ["City", dbTrainer.gymCity],
                    ["Years experience", dbTrainer.yearsExperience],
                    ["Education", dbTrainer.education],
                    ["Certifications", listPublicValue(dbTrainer.certifications)],
                    ["Skills", listPublicValue(dbTrainer.skills)],
                    ["Languages", listPublicValue(dbTrainer.languages)],
                    ["Working days", dbTrainer.workingDays],
                    ["Working hours", dbTrainer.workingHours],
                    ["Availability", dbTrainer.availability],
                  ] as Array<[string, string | null]>
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 border-b border-border/80 px-4 py-3 last:border-b-0"
                  >
                    <span className="shrink-0 text-muted-foreground">{label}</span>
                    <span className="max-w-[65%] whitespace-pre-wrap break-words text-right font-medium text-foreground">
                      {value?.trim() ? value : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {dbTrainer.certifications && dbTrainer.certifications.length > 0 && (
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  Credentials
                </p>
                <h2 className="font-display mb-4 flex items-center gap-2 text-3xl tracking-normal">
                  <Award className="h-7 w-7 text-primary" />
                  Certifications
                </h2>
                <div className="flex flex-wrap gap-3">
                  {dbTrainer.certifications.map((c) => (
                    <span
                      key={c}
                      className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {dbTrainer.skills && dbTrainer.skills.length > 0 && (
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  Focus
                </p>
                <h2 className="font-display mb-4 text-3xl tracking-normal">Specialties</h2>
                <div className="flex flex-wrap gap-3">
                  {dbTrainer.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {dbTrainer.languages && dbTrainer.languages.length > 0 && (
              <div>
                <h2 className="font-display mb-4 flex items-center gap-2 text-2xl tracking-normal">
                  <Languages className="h-6 w-6 text-primary" />
                  Languages
                </h2>
                <p className="text-muted-foreground">{dbTrainer.languages.join(" · ")}</p>
              </div>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display mb-4 text-2xl tracking-normal">Book a session</h3>
              <div className="mb-6 space-y-2 text-sm text-muted-foreground">
                {dbTrainer.availability ? (
                  <p className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {dbTrainer.availability}
                  </p>
                ) : null}
                {dbTrainer.workingHours ? (
                  <p className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {dbTrainer.workingHours}
                  </p>
                ) : null}
                {dbTrainer.workingDays ? (
                  <p className="flex items-start gap-2">
                    <Dumbbell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {dbTrainer.workingDays}
                  </p>
                ) : null}
                {!dbTrainer.availability &&
                  !dbTrainer.workingHours &&
                  !dbTrainer.workingDays && (
                    <p>Join the gym to book sessions with this trainer.</p>
                  )}
              </div>
              <Button asChild variant="hero" className="w-full">
                <Link href={registerHref}>Join this gym</Link>
              </Button>
              {gymOwnerId && (
                <Button asChild variant="outline" className="mt-3 w-full">
                  <Link href={`/gyms/${gymOwnerId}`}>View gym page</Link>
                </Button>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 text-sm">
              <h3 className="font-display mb-3 text-xl tracking-normal">At a glance</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>
                  <span className="text-muted-foreground/70">Role:</span> Personal trainer
                </p>
                <p>
                  <span className="text-muted-foreground/70">Gym:</span>{" "}
                  {dbTrainer.gymName || "—"}
                </p>
                {dbTrainer.gymCity && (
                  <p>
                    <span className="text-muted-foreground/70">City:</span> {dbTrainer.gymCity}
                  </p>
                )}
              </div>
            </div>

            {hasSocials ? (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-display mb-4 text-xl tracking-normal">Connect</h3>
                <div className="flex flex-wrap gap-2">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition hover:border-primary hover:text-primary"
                      aria-label={s.label}
                    >
                      {s.icon ? <s.icon className="h-4 w-4" /> : null}
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>

        {related.length > 0 && (
          <div className="container mx-auto mt-20 px-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Same gym
            </p>
            <h2 className="font-display mb-8 text-3xl tracking-normal md:text-4xl">
              Other trainers
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((rt) => (
                <Link
                  key={rt.userId}
                  href={`/trainers/${rt.userId}${gymOwnerId ? `?gym=${gymOwnerId}` : ""}`}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/50"
                >
                  <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                    {rt.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={rt.avatarUrl}
                        alt={rt.fullName || "Trainer"}
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      getNameInitials(rt.fullName || "PT")
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{rt.fullName || "Trainer"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {rt.specialization || "Personal training"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
