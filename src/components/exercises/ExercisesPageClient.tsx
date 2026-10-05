"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dumbbell, Search, Loader2 } from "lucide-react";
import { ScrollAnimate } from "@/hooks/useScrollAnimation";
import InteractiveBackground from "@/components/marketing/InteractiveBackground";
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
  "body weight",
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

export default function ExercisesPageClient() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bodyPartFilter, setBodyPartFilter] = useState("all");
  const [equipmentFilter, setEquipmentFilter] = useState("all");

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

  const filteredExercises = exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-card pb-16 pt-32">
        <InteractiveBackground variant="gradient" />
        <div className="container relative z-10 mx-auto px-4">
          <ScrollAnimate animation="fade-up">
            <h1 className="font-display mb-4 text-6xl md:text-8xl">
              EXERCISE <span className="text-gradient">LIBRARY</span>
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Browse our comprehensive exercise library with workout demos, instructions,
              and muscle group information.
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-40 border-b border-border bg-background/80 py-4 backdrop-blur-lg">
        <div className="container mx-auto space-y-4 px-4">
          <div className="relative mx-auto max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <label className="relative w-full max-w-[220px]">
              <span className="mb-1.5 block text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Body Part
              </span>
              <div className="relative">
                <select
                  value={bodyPartFilter}
                  onChange={(e) => setBodyPartFilter(e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Filter by body part"
                >
                  {bodyParts.map((part) => (
                    <option key={part} value={part}>
                      {part.charAt(0).toUpperCase() + part.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="relative w-full max-w-[220px]">
              <span className="mb-1.5 block text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Equipment
              </span>
              <div className="relative">
                <select
                  value={equipmentFilter}
                  onChange={(e) => setEquipmentFilter(e.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Filter by equipment"
                >
                  {equipmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>
        </div>
      </section>

      {/* Exercises Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredExercises.map((exercise, index) => (
                <ScrollAnimate
                  key={exercise.id}
                  animation="fade-up"
                  delay={Math.min(index, 8) * 0.06}
                >
                  <div className="glass-card hover-lift overflow-hidden rounded-2xl bg-card">
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
                  </div>
                </ScrollAnimate>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
