import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Clock,
  Dumbbell,
  MapPin,
  Phone,
  Users,
  Wallet,
} from "lucide-react";
import { getGymByOwnerId, getGymTrainers } from "@/lib/gyms";
import { getGymLiveStats } from "@/lib/platform-stats";
import { GymOfferingsTabs } from "@/components/gyms/GymOfferingsTabs";
import { GymReviewsSection } from "@/components/gyms/GymReviewsSection";
import { ShareGymButton } from "@/components/gyms/ShareGymButton";
import {
  buildPageMetadata,
  gymSeoTitle,
  jsonLdScript,
  localGymJsonLd,
} from "@/lib/seo";
import { resolveSiteUrl } from "@/lib/site-url";

export const revalidate = 30;

type PageProps = {
  params: Promise<{ ownerId: string }>;
};

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      const parts = u.pathname.split("/");
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIdx + 1]}`;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function vimeoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo.com")) return null;
    const id = u.pathname.split("/").filter(Boolean).pop();
    return id ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { ownerId } = await params;
  const gym = await getGymByOwnerId(ownerId);
  if (!gym) {
    return buildPageMetadata({
      title: "Gym Not Found",
      description: "This gym is not available on Forge Gym.",
      path: `/gyms/${ownerId}`,
      noIndex: true,
    });
  }

  const title = gymSeoTitle(gym.gymName, gym.gymCity);
  const description =
    gym.bio?.trim() ||
    `${gym.gymName}${gym.gymCity ? ` in ${gym.gymCity}` : ""} — hours, trainers, and memberships on Forge Gym.`;

  return buildPageMetadata({
    title,
    description: description.slice(0, 160),
    path: `/gyms/${ownerId}`,
    image: gym.gymMainImageUrl,
  });
}

export default async function GymDetailPage({ params }: PageProps) {
  const { ownerId } = await params;
  const gym = await getGymByOwnerId(ownerId);

  if (!gym) {
    notFound();
  }

  const [trainers, liveStats] = await Promise.all([
    getGymTrainers(ownerId),
    getGymLiveStats(ownerId),
  ]);

  const gallery = [
    ...(gym.gymMainImageUrl ? [gym.gymMainImageUrl] : []),
    ...gym.gymOptionalImagesUrls.filter((u) => u && u !== gym.gymMainImageUrl),
  ];

  const embed =
    (gym.gymVideoUrl &&
      (youtubeEmbedUrl(gym.gymVideoUrl) || vimeoEmbedUrl(gym.gymVideoUrl))) ||
    null;

  const registerHref = `/register?gym=${encodeURIComponent(ownerId)}`;
  const pageUrl = `${resolveSiteUrl().replace(/\/$/, "")}/gyms/${ownerId}`;

  const statTiles = [
    {
      icon: Users,
      label: "Active members",
      value: String(liveStats.memberCount),
    },
    {
      icon: Dumbbell,
      label: "Trainers",
      value: String(liveStats.trainerCount),
    },
    {
      icon: CalendarDays,
      label: "Active classes",
      value: String(liveStats.classCount),
    },
    {
      icon: Clock,
      label: "Peak hours",
      value: gym.peakHours || "—",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          localGymJsonLd({
            name: gym.gymName,
            description: gym.bio,
            city: gym.gymCity,
            url: pageUrl,
            image: gym.gymMainImageUrl,
          }),
        )}
      />
      <Navbar />

      <section className="relative min-h-[78vh] overflow-hidden md:min-h-[88vh]">
        {gym.gymMainImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gym.gymMainImageUrl}
            alt={gym.gymName}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-muted to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/20 to-background/50" />

        <div className="container relative z-10 mx-auto flex min-h-[78vh] flex-col justify-end px-4 pb-14 pt-28 md:min-h-[88vh] md:px-6 md:pb-20 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
              {gym.gymType && (
                <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 backdrop-blur-sm">
                  {gym.gymType}
                </span>
              )}
              {gym.gymCity && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-3 py-1 backdrop-blur-sm">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {gym.gymCity}
                </span>
              )}
              {gym.yearsOperating && (
                <span className="rounded-full border border-border/60 bg-background/70 px-3 py-1 backdrop-blur-sm">
                  {gym.yearsOperating} years
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 sm:gap-5">
              {gym.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={gym.avatarUrl}
                  alt={`${gym.gymName} logo`}
                  className="h-16 w-16 shrink-0 object-cover sm:h-20 sm:w-20 md:h-24 md:w-24"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-card sm:h-20 sm:w-20 md:h-24 md:w-24">
                  <Building2 className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
                </div>
              )}
              <h1 className="font-display text-5xl leading-[0.92] tracking-normal text-foreground sm:text-6xl md:text-8xl">
                {gym.gymName}
              </h1>
            </div>

            <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              {gym.bio?.trim() ||
                `Train at ${gym.gymName}${gym.gymCity ? ` in ${gym.gymCity}` : ""}. Join as a member and get approved by the gym owner.`}
            </p>

            {gym.address && (
              <p className="mt-3 flex max-w-xl items-start gap-2 text-sm text-muted-foreground md:text-base">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{gym.address}</span>
              </p>
            )}

            {gym.phone && (
              <p className="mt-2 flex max-w-xl items-center gap-2 text-sm text-muted-foreground md:text-base">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <a
                  href={`tel:${gym.phone.replace(/\s+/g, "")}`}
                  className="hover:text-foreground hover:underline"
                >
                  {gym.phone}
                </a>
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" variant="hero">
                <Link href={registerHref}>
                  Join this gym
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/gyms">Browse gyms</Link>
              </Button>
              <ShareGymButton gymName={gym.gymName} ownerId={ownerId} />
            </div>

            {gym.ownerName && (
              <p className="mt-6 text-sm text-muted-foreground">
                Operated by{" "}
                <span className="font-medium text-foreground">{gym.ownerName}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/60">
        <div className="container mx-auto grid grid-cols-2 gap-px bg-border md:grid-cols-4">
          {statTiles.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-2 bg-background px-5 py-6 md:px-8"
            >
              <item.icon className="h-4 w-4 text-primary" />
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {item.label}
              </p>
              <p className="text-lg font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {(gym.monthlyFee || gym.trainerFee) && (
        <section className="border-b border-border py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Pricing
            </p>
            <h2 className="font-display mb-8 text-3xl tracking-normal md:text-4xl">
              Membership fees
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {gym.monthlyFee && (
                <div className="flex items-start gap-4 rounded-2xl border border-border bg-card px-5 py-6">
                  <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Monthly gym fee
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {gym.monthlyFee}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        / month
                      </span>
                    </p>
                  </div>
                </div>
              )}
              {gym.trainerFee && (
                <div className="flex items-start gap-4 rounded-2xl border border-border bg-card px-5 py-6">
                  <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Trainer fee
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">
                      {gym.trainerFee}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">
                        / month
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <GymOfferingsTabs
        gymName={gym.gymName}
        gymOwnerId={ownerId}
        facilities={gym.facilities}
        services={gym.services}
        trainers={trainers}
      />

      {gallery.length > 0 && (
        <section className="border-t border-border py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Gallery
            </p>
            <h2 className="font-display mb-10 text-4xl tracking-normal md:text-5xl">
              See the space
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {gallery.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className={`relative overflow-hidden rounded-xl border border-border ${
                    i === 0
                      ? "col-span-2 aspect-[16/9] md:col-span-2 md:row-span-2 md:aspect-auto md:min-h-[420px]"
                      : "aspect-square"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${gym.gymName} photo ${i + 1}`}
                    className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {(gym.gymVideoFileUrl || embed || gym.gymVideoUrl) && (
        <section className="border-t border-border py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6 lg:px-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-primary">
              Tour
            </p>
            <h2 className="font-display mb-10 text-4xl tracking-normal md:text-5xl">
              Watch the gym
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {gym.gymVideoFileUrl ? (
                <video
                  src={gym.gymVideoFileUrl}
                  controls
                  playsInline
                  poster={gym.gymMainImageUrl || undefined}
                  className="aspect-video w-full"
                />
              ) : embed ? (
                <iframe
                  title={`${gym.gymName} video`}
                  src={embed}
                  className="aspect-video w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex aspect-video items-center justify-center">
                  <Button asChild variant="hero">
                    <a href={gym.gymVideoUrl!} target="_blank" rel="noopener noreferrer">
                      Open video link
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-border py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <GymReviewsSection gymOwnerId={ownerId} />
        </div>
      </section>

      <section className="border-t border-border bg-card/40 py-20">
        <div className="container mx-auto px-4 text-center md:px-6 lg:px-8">
          <h2 className="font-display text-4xl tracking-normal md:text-6xl">
            Ready to join {gym.gymName}?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Create a member account linked to this gym. After email verification, the owner
            approves your membership.
          </p>
          <Button asChild size="lg" variant="hero" className="mt-8">
            <Link href={registerHref}>
              Start registration
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
