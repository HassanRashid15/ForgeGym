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
  MapPin,
  Users,
  Wallet,
} from "lucide-react";
import { getGymByOwnerId, getGymTrainers } from "@/lib/gyms";
import { GymOfferingsTabs } from "@/components/gyms/GymOfferingsTabs";

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
    return { title: "Gym Not Found | Forge Gym" };
  }
  return {
    title: `${gym.gymName} | Forge Gym`,
    description:
      gym.bio ||
      `${gym.gymName}${gym.gymCity ? ` in ${gym.gymCity}` : ""} — train with Forge Gym.`,
    openGraph: gym.gymMainImageUrl
      ? { images: [{ url: gym.gymMainImageUrl }] }
      : undefined,
  };
}

export default async function GymDetailPage({ params }: PageProps) {
  const { ownerId } = await params;
  const gym = await getGymByOwnerId(ownerId);

  if (!gym) {
    notFound();
  }

  const trainers = await getGymTrainers(ownerId);

  const gallery = [
    ...(gym.gymMainImageUrl ? [gym.gymMainImageUrl] : []),
    ...gym.gymOptionalImagesUrls.filter((u) => u && u !== gym.gymMainImageUrl),
  ];

  const embed =
    (gym.gymVideoUrl &&
      (youtubeEmbedUrl(gym.gymVideoUrl) || vimeoEmbedUrl(gym.gymVideoUrl))) ||
    null;

  const registerHref = `/register?gym=${encodeURIComponent(ownerId)}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />

      {/* Hero — main image from DB */}
      <section className="relative min-h-[88vh] overflow-hidden">
        {gym.gymMainImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gym.gymMainImageUrl}
            alt={gym.gymName}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#3f0d0d_0%,_#09090b_55%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/20" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.75)_0%,rgba(9,9,11,0.2)_55%,rgba(9,9,11,0.45)_100%)]" />

        <div className="container relative z-10 mx-auto flex min-h-[88vh] flex-col justify-end px-4 pb-16 pt-32 md:pb-20">
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
              {gym.gymType && (
                <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 backdrop-blur-sm">
                  {gym.gymType}
                </span>
              )}
              {gym.gymCity && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-3 py-1 backdrop-blur-sm">
                  <MapPin className="h-3.5 w-3.5 text-[#EF1111]" />
                  {gym.gymCity}
                </span>
              )}
            </div>

            <h1 className="font-display text-6xl leading-[0.92] tracking-wide text-white md:text-8xl">
              {gym.gymName}
            </h1>

            <p className="mt-5 max-w-xl text-base text-zinc-300 md:text-lg">
              {gym.bio?.trim() ||
                `Train at ${gym.gymName}${gym.gymCity ? ` in ${gym.gymCity}` : ""}. Join as a member and get approved by the gym owner.`}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="bg-[#EF1111] text-white hover:bg-[#C90808]">
                <Link href={registerHref}>
                  Join this gym
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-black/20 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/#gyms">Browse gyms</Link>
              </Button>
            </div>

            {gym.ownerName && (
              <p className="mt-6 text-sm text-zinc-400">
                Operated by <span className="text-zinc-200">{gym.ownerName}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-zinc-800/80 bg-zinc-900/40">
        <div className="container mx-auto grid grid-cols-2 gap-px bg-zinc-800/50 md:grid-cols-4">
          {[
            {
              icon: CalendarDays,
              label: "Years operating",
              value: gym.yearsOperating || "—",
            },
            {
              icon: Users,
              label: "Capacity",
              value: gym.capacity || "—",
            },
            {
              icon: Clock,
              label: "Peak hours",
              value: gym.peakHours || "—",
            },
            {
              icon: Building2,
              label: "Days / week",
              value: gym.operatingDays != null ? String(gym.operatingDays) : "—",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-2 bg-zinc-950 px-5 py-6 md:px-8"
            >
              <item.icon className="h-4 w-4 text-[#EF1111]" />
              <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                {item.label}
              </p>
              <p className="text-lg font-medium text-zinc-100">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {(gym.monthlyFee || gym.trainerFee) && (
        <section className="border-b border-zinc-800/80 py-12 md:py-16">
          <div className="container mx-auto px-4">
            <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[#EF1111]">
              Pricing
            </p>
            <h2 className="font-display mb-8 text-3xl md:text-4xl">Membership fees</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {gym.monthlyFee && (
                <div className="flex items-start gap-4 border border-zinc-800 bg-zinc-900/40 px-5 py-6">
                  <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-[#EF1111]" />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                      Monthly gym fee
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {gym.monthlyFee}
                      <span className="ml-1 text-sm font-normal text-zinc-400">/ month</span>
                    </p>
                  </div>
                </div>
              )}
              {gym.trainerFee && (
                <div className="flex items-start gap-4 border border-zinc-800 bg-zinc-900/40 px-5 py-6">
                  <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-[#EF1111]" />
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                      Trainer fee
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-white">
                      {gym.trainerFee}
                      <span className="ml-1 text-sm font-normal text-zinc-400">/ month</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Facilities + Services + Trainers */}
      <GymOfferingsTabs
        gymName={gym.gymName}
        gymOwnerId={ownerId}
        facilities={gym.facilities}
        services={gym.services}
        trainers={trainers}
      />

      {/* Gallery — main + optional images from DB */}
      {gallery.length > 0 && (
        <section className="border-t border-zinc-800/80 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[#EF1111]">
              Gallery
            </p>
            <h2 className="font-display mb-10 text-4xl md:text-5xl">See the space</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
              {gallery.map((src, i) => (
                <div
                  key={`${src}-${i}`}
                  className={`relative overflow-hidden ${
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

      {/* Video — uploaded file or link from DB */}
      {(gym.gymVideoFileUrl || embed || gym.gymVideoUrl) && (
        <section className="border-t border-zinc-800/80 py-20 md:py-28">
          <div className="container mx-auto px-4">
            <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[#EF1111]">
              Tour
            </p>
            <h2 className="font-display mb-10 text-4xl md:text-5xl">Watch the gym</h2>
            <div className="overflow-hidden border border-zinc-800 bg-black">
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
                  <Button asChild className="bg-[#EF1111] hover:bg-[#C90808]">
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

      <section className="border-t border-zinc-800/80 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-4xl md:text-6xl">Ready to join {gym.gymName}?</h2>
          <p className="mx-auto mt-4 max-w-lg text-zinc-400">
            Create a member account linked to this gym. After email verification, the owner
            approves your membership.
          </p>
          <Button asChild size="lg" className="mt-8 bg-[#EF1111] hover:bg-[#C90808]">
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
