import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { getTrainerById, allTrainers } from "@/data/trainers";
import { getPublicTrainerById, getGymTrainers } from "@/lib/gyms";
import {
  ArrowLeft,
  Award,
  Building2,
  Calendar,
  Dumbbell,
  GraduationCap,
  Languages,
  MapPin,
  Sparkles,
} from "lucide-react";
import { getNameInitials } from "@/lib/utils";

export const revalidate = 30;

function listPublicValue(value?: string[] | string | null) {
  if (!value) return null;
  if (Array.isArray(value)) {
    const joined = value.filter(Boolean).join(", ");
    return joined || null;
  }
  return String(value) || null;
}

function formatPublicDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gym?: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const dbTrainer = await getPublicTrainerById(id);
  if (dbTrainer) {
    return {
      title: `${dbTrainer.fullName || "Trainer"} | Forge Gym`,
      description:
        dbTrainer.bio ||
        `${dbTrainer.fullName || "Trainer"}${
          dbTrainer.specialization ? ` — ${dbTrainer.specialization}` : ""
        }`,
    };
  }
  const staticTrainer = getTrainerById(id);
  if (staticTrainer) {
    return {
      title: `${staticTrainer.name} | Forge Gym`,
      description: staticTrainer.bio,
    };
  }
  return { title: "Trainer Not Found | Forge Gym" };
}

export default async function TrainerDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { gym: gymQuery } = await searchParams;

  const dbTrainer = await getPublicTrainerById(id);

  if (dbTrainer) {
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

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <Navbar />

        <section className="relative pt-24">
          <div className="absolute inset-0 h-[42vh] overflow-hidden bg-zinc-900">
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImage}
                alt={dbTrainer.fullName || "Trainer"}
                className="h-full w-full object-cover opacity-40"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/40" />
          </div>

          <div className="container relative z-10 mx-auto px-4 pb-16 pt-28">
            <Link
              href={backHref}
              className="mb-8 inline-flex items-center gap-2 text-zinc-400 transition-colors hover:text-[#EF1111]"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>

            <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
              <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#EF1111] text-2xl font-bold text-white sm:size-32">
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
                <h1 className="font-display text-5xl md:text-7xl">
                  {dbTrainer.fullName || "Trainer"}
                </h1>
                <p className="mt-2 text-lg font-semibold text-[#EF1111]">
                  {dbTrainer.specialization || "Personal trainer"}
                </p>
                {(dbTrainer.gymName || dbTrainer.gymCity) && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
                    {dbTrainer.gymName && (
                      <Link
                        href={gymOwnerId ? `/gyms/${gymOwnerId}` : "#"}
                        className="inline-flex items-center gap-2 transition hover:text-white"
                      >
                        <span className="relative flex size-5 shrink-0 items-center justify-center overflow-hidden rounded bg-[#EF1111]">
                          {dbTrainer.gymMainImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={dbTrainer.gymMainImageUrl}
                              alt={dbTrainer.gymName}
                              className="absolute inset-0 size-full object-cover"
                            />
                          ) : (
                            <Building2 className="h-3 w-3 text-white" />
                          )}
                        </span>
                        {dbTrainer.gymName}
                      </Link>
                    )}
                    {dbTrainer.gymCity && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[#EF1111]" />
                        {dbTrainer.gymCity}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-800/80 py-16">
          <div className="container mx-auto grid gap-12 px-4 lg:grid-cols-3">
            <div className="space-y-12 lg:col-span-2">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
                  {
                    icon: Dumbbell,
                    value: dbTrainer.maxClientCapacity,
                    label: "Max clients",
                  },
                ]
                  .filter((s) => s.value)
                  .map((s) => (
                    <div
                      key={s.label}
                      className="border border-zinc-800 bg-zinc-900/40 p-5 text-center"
                    >
                      <s.icon className="mx-auto mb-2 h-7 w-7 text-[#EF1111]" />
                      <div className="line-clamp-2 font-display text-lg">{s.value}</div>
                      <div className="text-xs text-zinc-500">{s.label}</div>
                    </div>
                  ))}
              </div>

              <div>
                <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[#EF1111]">
                  About
                </p>
                <h2 className="font-display mb-4 text-3xl md:text-4xl">
                  Meet {dbTrainer.fullName?.split(" ")[0] || "the trainer"}
                </h2>
                <p className="leading-relaxed text-zinc-400">
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
                <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[#EF1111]">
                  Profile
                </p>
                <h2 className="font-display mb-4 text-3xl">Full details</h2>
                <div className="space-y-0 text-sm">
                  {(
                    [
                      ["Name", dbTrainer.fullName],
                      ["Specialization", dbTrainer.specialization],
                      ["Gender", dbTrainer.gender],
                      ["Status", dbTrainer.accountStatus],
                      ["Gym", dbTrainer.gymName],
                      ["City", dbTrainer.gymCity],
                      ["Joined", formatPublicDate(dbTrainer.joinDate)],
                      ["Years experience", dbTrainer.yearsExperience],
                      ["Education", dbTrainer.education],
                      ["Certification #", dbTrainer.certificationNumber],
                      [
                        "Certifications",
                        listPublicValue(dbTrainer.certifications),
                      ],
                      ["Skills", listPublicValue(dbTrainer.skills)],
                      ["Languages", listPublicValue(dbTrainer.languages)],
                      ["Employment type", dbTrainer.employmentType],
                      ["Department", dbTrainer.department],
                      ["Branch / department", dbTrainer.branchDepartment],
                      ["Working days", dbTrainer.workingDays],
                      ["Working hours", dbTrainer.workingHours],
                      ["Availability", dbTrainer.availability],
                      ["Max client capacity", dbTrainer.maxClientCapacity],
                      [
                        "Assigned members",
                        listPublicValue(dbTrainer.assignedMembers),
                      ],
                      ["PT sessions", dbTrainer.ptSessions],
                      ["Leave info", dbTrainer.leaveInfo],
                    ] as Array<[string, string | null]>
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between gap-4 border-b border-zinc-800/80 py-3"
                    >
                      <span className="shrink-0 text-zinc-500">{label}</span>
                      <span className="max-w-[65%] whitespace-pre-wrap break-words text-right font-medium text-zinc-100">
                        {value?.trim() ? value : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {dbTrainer.certifications && dbTrainer.certifications.length > 0 && (
                <div>
                  <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[#EF1111]">
                    Credentials
                  </p>
                  <h2 className="font-display mb-4 flex items-center gap-2 text-3xl">
                    <Award className="h-7 w-7 text-[#EF1111]" />
                    Certifications
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {dbTrainer.certifications.map((c) => (
                      <span
                        key={c}
                        className="border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {dbTrainer.skills && dbTrainer.skills.length > 0 && (
                <div>
                  <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[#EF1111]">
                    Focus
                  </p>
                  <h2 className="font-display mb-4 text-3xl">Specialties</h2>
                  <div className="flex flex-wrap gap-3">
                    {dbTrainer.skills.map((s) => (
                      <span
                        key={s}
                        className="bg-[#EF1111]/10 px-4 py-2 text-sm font-semibold text-[#EF1111]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {dbTrainer.languages && dbTrainer.languages.length > 0 && (
                <div>
                  <h2 className="font-display mb-4 flex items-center gap-2 text-2xl">
                    <Languages className="h-6 w-6 text-[#EF1111]" />
                    Languages
                  </h2>
                  <p className="text-zinc-400">{dbTrainer.languages.join(" · ")}</p>
                </div>
              )}
            </div>

            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              <div className="border border-zinc-800 bg-zinc-900/40 p-6">
                <h3 className="font-display mb-4 text-2xl">Book a session</h3>
                <div className="mb-6 space-y-2 text-sm text-zinc-400">
                  {dbTrainer.availability ? (
                    <p className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#EF1111]" />
                      {dbTrainer.availability}
                    </p>
                  ) : null}
                  {dbTrainer.workingHours ? (
                    <p className="flex items-start gap-2">
                      <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[#EF1111]" />
                      {dbTrainer.workingHours}
                    </p>
                  ) : null}
                  {dbTrainer.workingDays ? (
                    <p className="flex items-start gap-2">
                      <Dumbbell className="mt-0.5 h-4 w-4 shrink-0 text-[#EF1111]" />
                      {dbTrainer.workingDays}
                    </p>
                  ) : null}
                  {dbTrainer.ptSessions ? (
                    <p className="flex items-start gap-2">
                      <Award className="mt-0.5 h-4 w-4 shrink-0 text-[#EF1111]" />
                      {dbTrainer.ptSessions}
                    </p>
                  ) : null}
                  {!dbTrainer.availability &&
                    !dbTrainer.workingHours &&
                    !dbTrainer.workingDays &&
                    !dbTrainer.ptSessions && (
                      <p>Join the gym to book sessions with this trainer.</p>
                    )}
                </div>
                <Button asChild className="w-full bg-[#EF1111] hover:bg-[#C90808]">
                  <Link href={registerHref}>Join this gym</Link>
                </Button>
                {gymOwnerId && (
                  <Button asChild variant="outline" className="mt-3 w-full border-zinc-700">
                    <Link href={`/gyms/${gymOwnerId}`}>View gym page</Link>
          </Button>
                )}
              </div>

              <div className="border border-zinc-800 bg-zinc-900/40 p-6 text-sm">
                <h3 className="font-display mb-3 text-xl">At a glance</h3>
                <div className="space-y-2 text-zinc-400">
                  <p>
                    <span className="text-zinc-500">Role:</span> Personal trainer
                  </p>
                  <p>
                    <span className="text-zinc-500">Status:</span>{" "}
                    {dbTrainer.accountStatus || "—"}
                  </p>
                  <p>
                    <span className="text-zinc-500">Gym:</span> {dbTrainer.gymName || "—"}
                  </p>
                  {dbTrainer.gymCity && (
                    <p>
                      <span className="text-zinc-500">City:</span> {dbTrainer.gymCity}
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>

          {related.length > 0 && (
            <div className="container mx-auto mt-20 px-4">
              <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-[#EF1111]">
                Same gym
              </p>
              <h2 className="font-display mb-8 text-3xl md:text-4xl">Other trainers</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((rt) => (
                  <Link
                    key={rt.userId}
                    href={`/trainers/${rt.userId}${gymOwnerId ? `?gym=${gymOwnerId}` : ""}`}
                    className="flex gap-4 border border-zinc-800/80 bg-zinc-950/60 p-4 transition hover:border-[#EF1111]/50"
                  >
                    <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#EF1111] text-sm font-semibold text-white">
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
                      <p className="truncate text-sm text-zinc-400">
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

  const trainer = getTrainerById(id);
  if (!trainer) {
    notFound();
  }

  const related = allTrainers.filter((t) => t.id !== trainer.id).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative pt-24">
        <div className="absolute inset-0 h-[50vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={trainer.image} alt={trainer.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        </div>

        <div className="container relative z-10 mx-auto px-4 pb-16 pt-32">
          <Link
            href="/trainers"
            className="mb-8 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Trainers
          </Link>
          <h1 className="font-display mb-2 text-6xl md:text-8xl">{trainer.name}</h1>
          <p className="text-xl font-semibold text-primary">{trainer.role}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="space-y-12 lg:col-span-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="glass-card rounded-xl p-6 text-center">
                  <Award className="mx-auto mb-2 h-8 w-8 text-primary" />
                  <div className="font-display text-2xl">{trainer.experience}</div>
                  <div className="text-sm text-muted-foreground">Experience</div>
                </div>
                <div className="glass-card rounded-xl p-6 text-center">
                  <Dumbbell className="mx-auto mb-2 h-8 w-8 text-primary" />
                  <div className="font-display text-2xl">{trainer.clients}</div>
                  <div className="text-sm text-muted-foreground">Clients</div>
                </div>
                <div className="glass-card rounded-xl p-6 text-center">
                  <Sparkles className="mx-auto mb-2 h-8 w-8 text-primary" />
                  <div className="font-display text-2xl">{trainer.rating}</div>
                  <div className="text-sm text-muted-foreground">Rating</div>
                </div>
              </div>

              <div>
                <h2 className="font-display mb-4 text-3xl">
                  ABOUT {trainer.name.split(" ")[0].toUpperCase()}
                </h2>
                <p className="mb-4 leading-relaxed text-muted-foreground">{trainer.bio}</p>
                <p className="leading-relaxed text-muted-foreground">{trainer.longBio}</p>
              </div>

              <div>
                <h2 className="font-display mb-4 flex items-center gap-2 text-3xl">
                  <Award className="h-8 w-8 text-primary" />
                  CERTIFICATIONS
                </h2>
                <div className="flex flex-wrap gap-3">
                  {trainer.certifications.map((c) => (
                    <span key={c} className="rounded-lg bg-secondary px-4 py-2 font-medium">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="font-display mb-4 text-3xl">SPECIALTIES</h2>
                <div className="flex flex-wrap gap-3">
                  {trainer.specialties.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-primary/10 px-4 py-2 font-semibold text-primary"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <aside className="h-fit space-y-6 self-start lg:sticky lg:top-24">
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-display mb-4 text-2xl">BOOK A SESSION</h3>
                <div className="mb-6">
                  <h4 className="mb-3 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4 text-primary" />
                    Available Times
                  </h4>
                  <div className="space-y-2">
                    {trainer.schedule.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3 text-sm"
                      >
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button className="w-full" variant="hero" asChild>
                  <Link href="/contact">Book Free Consultation</Link>
                </Button>
              </div>
            </aside>
          </div>

          {related.length > 0 && (
            <div className="mt-24">
              <h2 className="font-display mb-8 text-4xl">
                MEET OTHER <span className="text-gradient">TRAINERS</span>
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {related.map((rt) => (
                  <div
                    key={rt.id}
                    className="glass-card group flex flex-col overflow-hidden rounded-xl hover-lift"
                  >
                    <Link href={`/trainers/${rt.id}`} className="relative block h-56 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={rt.image}
                        alt={rt.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="font-display mb-1 text-xl">{rt.name}</h3>
                      <p className="mb-4 text-sm font-medium text-primary">{rt.role}</p>
                      <Button size="sm" className="mt-auto w-full" asChild>
                        <Link href={`/trainers/${rt.id}`}>View Profile</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
