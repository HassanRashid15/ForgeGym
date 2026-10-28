"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Dumbbell,
  Search,
  Loader2,
  LogIn,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  ArrowRight,
} from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import { ExerciseGuideVideoModal } from "@/components/progress/ExerciseGuideVideoModal";
import { useAuth } from "@/contexts/AuthContext";
import type { Exercise } from "@/app/api/exercises/route";

const bodyParts = [
  "all",
  "back",
  "cardio",
  "chest",
  "lower arms",
  "lower legs",
  "neck",
  "shoulders",
  "upper arms",
  "upper legs",
  "waist",
];

const equipmentTypes = [
  "all",
  "assisted",
  "band",
  "barbell",
  "bodyweight",
  "cable",
  "dumbbell",
  "elliptical machine",
  "ez barbell",
  "hammer",
  "kettlebell",
  "leverage machine",
  "medicine ball",
  "olympic barbell",
  "resistance band",
  "roller",
  "rope",
  "skierg machine",
  "sled machine",
  "smith machine",
  "stability ball",
  "stationary bike",
  "stepmill machine",
  "tire",
  "trap bar",
  "upper body ergometer",
  "weighted",
];

type GateStep = "login" | "join" | null;

const PAGE_SIZE = 6;

export default function ExercisesPageClient() {
  const { user, isAuthenticated, isAdmin, isSuperAdmin, isTrainer } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bodyPartFilter, setBodyPartFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [gateStep, setGateStep] = useState<GateStep>(null);
  const [guideExercise, setGuideExercise] = useState<Exercise | null>(null);

  const hasGymAccess =
    isAdmin ||
    isSuperAdmin ||
    isTrainer ||
    Boolean(user?.gymOwnerId);

  useEffect(() => {
    async function fetchExercises() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (bodyPartFilter !== "all") params.append("bodyPart", bodyPartFilter);
        if (equipmentFilter !== "all") params.append("equipment", equipmentFilter);
        params.append("limit", "50");

        const response = await fetch(`/api/exercises?${params.toString()}`);
        const data = await response.json();
        setExercises(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch exercises:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchExercises();
  }, [bodyPartFilter, equipmentFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, bodyPartFilter, equipmentFilter]);

  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredExercises.length / PAGE_SIZE));
  const visibleExercises = filteredExercises.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const goToPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    setPage(clamped);
    document
      .getElementById("exercises-results")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  let pageNumbers: number[];
  if (totalPages <= 7) {
    pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    const pages = new Set<number>([1, totalPages, page]);
    for (let i = page - 1; i <= page + 1; i++) {
      if (i >= 1 && i <= totalPages) pages.add(i);
    }
    pageNumbers = Array.from(pages).sort((a, b) => a - b);
  }

  function handleExerciseClick(exercise: Exercise) {
    if (!isAuthenticated) {
      setGateStep("login");
      return;
    }
    if (!hasGymAccess) {
      setGateStep("join");
      return;
    }
    setGuideExercise(exercise);
  }

  function scrollToResults() {
    document
      .getElementById("exercises-results")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative isolate overflow-hidden bg-background">
        <div
          className="pointer-events-none absolute inset-0 forge-hero-media"
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/exercise_heros.png"
            alt=""
            className="absolute inset-0 h-full w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-black/55 to-transparent sm:from-black/92 sm:via-black/40 sm:to-transparent" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[78svh] max-w-7xl flex-col justify-center px-4 pb-10 pt-28 sm:min-h-[72svh] sm:px-6 sm:pb-14 sm:pt-32 lg:px-2 lg:pb-16">
          <ScrollAnimate animation="fade-up" className="max-w-xl md:max-w-2xl">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-primary sm:text-xs">
              Train Smart
            </p>
            <h1 className="font-display text-[clamp(2.75rem,9vw,5.5rem)] leading-[0.9] tracking-wide text-white">
              <span className="block">EXERCISE</span>
              <span className="relative mt-[-0.05em] inline-block pb-[0.35em] pr-[0.1em] text-primary">
                <span className="relative z-[1]">LIBRARY</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/red_stroke.png"
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute left-[-4%] top-[70%] z-0 h-[0.36em] w-[112%] max-w-none select-none object-fill object-left sm:h-[0.32em]"
                />
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:mt-0 sm:text-base">
              Discover our comprehensive exercise library with detailed
              instructions, targeted muscle groups and proper form guidance to
              help you train smarter and achieve your goals.
            </p>
          </ScrollAnimate>

          <div className="mt-8 w-full sm:mt-10">
            <form
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/55 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:p-2 sm:pl-4"
              onSubmit={(e) => {
                e.preventDefault();
                scrollToResults();
              }}
            >
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search exercises</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search exercises..."
                  className="h-11 border-white/15 bg-white/5 pl-10 text-white placeholder:text-white/45 focus-visible:ring-primary sm:border-transparent sm:bg-transparent"
                />
              </label>

              <div className="hidden h-8 w-px shrink-0 bg-white/15 sm:block" />

              <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[200px]">
                <Dumbbell className="ml-2 hidden h-4 w-4 shrink-0 text-white/50 sm:block" />
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Body part</span>
                  <select
                    value={bodyPartFilter}
                    onChange={(e) => setBodyPartFilter(e.target.value)}
                    className="h-11 w-full appearance-none rounded-md border border-white/15 bg-white/5 px-3 pr-8 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-primary sm:border-0 sm:bg-transparent"
                    aria-label="Filter by body part"
                  >
                    {bodyParts.map((part) => (
                      <option
                        key={part}
                        value={part}
                        className="bg-zinc-900 text-white"
                      >
                        {part === "all"
                          ? "All body parts"
                          : part.charAt(0).toUpperCase() + part.slice(1)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                </label>
              </div>

              <div className="hidden h-8 w-px shrink-0 bg-white/15 sm:block" />

              <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[200px]">
                <ListFilter className="ml-2 hidden h-4 w-4 shrink-0 text-white/50 sm:block" />
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Equipment</span>
                  <select
                    value={equipmentFilter}
                    onChange={(e) => setEquipmentFilter(e.target.value)}
                    className="h-11 w-full appearance-none rounded-md border border-white/15 bg-white/5 px-3 pr-8 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-primary sm:border-0 sm:bg-transparent"
                    aria-label="Filter by equipment"
                  >
                    {equipmentTypes.map((type) => (
                      <option
                        key={type}
                        value={type}
                        className="bg-zinc-900 text-white"
                      >
                        {type === "all"
                          ? "All equipment"
                          : type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                </label>
              </div>

              <Button
                type="submit"
                className="h-11 w-full gap-2 rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto sm:shrink-0"
              >
                Search
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      <section
        id="exercises-results"
        className="relative z-10 scroll-mt-24 pb-16 pt-8 sm:pt-10"
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className="-mt-[7px] h-2 w-8 shrink-0 rounded-xs bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.85)]"
                  aria-hidden
                />
                <h2 className="font-display text-2xl italic leading-normal tracking-wide text-foreground sm:text-3xl md:text-4xl">
                  <span className="text-foreground">FEATURED </span>
                  <span className="inline-block pr-[0.1em] text-primary">
                    EXERCISES
                  </span>
                </h2>
              </div>
              <p className="mt-2 max-w-2xl text-left text-lg text-muted-foreground">
                Discover our comprehensive exercise library with detailed
                instructions and proper form guidance.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Loading…"
                : `${filteredExercises.length} exercise${filteredExercises.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredExercises.length === 0 ? (
            <div className="mx-auto max-w-md text-center">
              <Dumbbell className="mx-auto mb-4 h-12 w-12 text-primary/70" />
              <h2 className="font-display mb-2 text-3xl">No exercises found</h2>
              <p className="text-muted-foreground">
                Try adjusting your filters or search terms.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {visibleExercises.map((exercise, index) => (
                  <ScrollAnimate
                    key={`${exercise.id}-${page}`}
                    animation="fade-up"
                    delay={Math.min(index, 5) * 0.06}
                  >
                    <button
                      type="button"
                      onClick={() => handleExerciseClick(exercise)}
                      className="glass-card hover-lift w-full overflow-hidden rounded-2xl bg-card text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="relative aspect-square bg-muted/30">
                        {exercise.gifUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={exercise.gifUrl}
                            alt={exercise.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-primary/10">
                            <Dumbbell className="h-16 w-16 text-primary/70" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                            {exercise.bodyPart}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="font-display mb-2 text-xl font-bold">
                          {exercise.name}
                        </h3>
                        <div className="mb-4 flex flex-wrap gap-2">
                          <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                            {exercise.equipment}
                          </span>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            Target: {exercise.target}
                          </span>
                        </div>
                      </div>
                    </button>
                  </ScrollAnimate>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-12 flex flex-col items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                    <span className="mx-2 text-border">·</span>
                    {filteredExercises.length} exercises
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => goToPage(page - 1)}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>

                    {pageNumbers.map((n, idx) => {
                      const prev = pageNumbers[idx - 1];
                      const showEllipsis = prev != null && n - prev > 1;
                      return (
                        <span key={n} className="flex items-center gap-2">
                          {showEllipsis && (
                            <span className="px-1 text-muted-foreground">…</span>
                          )}
                          <Button
                            type="button"
                            variant={n === page ? "default" : "outline"}
                            size="sm"
                            className="min-w-9"
                            onClick={() => goToPage(n)}
                            aria-current={n === page ? "page" : undefined}
                          >
                            {n}
                          </Button>
                        </span>
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => goToPage(page + 1)}
                      aria-label="Next page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />

      <Dialog
        open={gateStep !== null}
        onOpenChange={(open) => {
          if (!open) setGateStep(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {gateStep === "login" ? (
            <>
              <DialogHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <LogIn className="h-6 w-6" />
                </div>
                <DialogTitle className="font-display text-2xl">
                  Login to continue
                </DialogTitle>
                <DialogDescription>
                  Sign in first to unlock exercise demos and guides. After that,
                  join any gym to get full access.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button asChild className="w-full">
                  <Link href="/login?redirect=/exercises">Log in</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/register">Create account</Link>
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <DialogTitle className="font-display text-2xl">
                  Join a gym
                </DialogTitle>
                <DialogDescription>
                  You&apos;re signed in. Join any gym on Gym Journey Hub to unlock
                  exercise demos, form guides, and training tools.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button asChild className="w-full">
                  <Link href="/gyms">Browse gyms</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setGateStep(null)}
                >
                  Not now
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ExerciseGuideVideoModal
        open={Boolean(guideExercise)}
        exerciseName={guideExercise?.name ?? null}
        meta={
          guideExercise
            ? `${guideExercise.bodyPart} · ${guideExercise.equipment} · Target: ${guideExercise.target}`
            : null
        }
        onClose={() => setGuideExercise(null)}
      />
    </div>
  );
}
