"use client";

import { useMemo, useState } from "react";
import type { CatalogExercise } from "@/api/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Check, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const EQUIPMENT_TABS = [
  "All",
  "Barbell",
  "Dumbbell",
  "Kettlebell",
  "Machine",
  "Bodyweight",
  "Other",
] as const;

type EquipmentTab = (typeof EQUIPMENT_TABS)[number];
type TabId = "Recommended" | EquipmentTab;

function exerciseEquipmentTab(ex: CatalogExercise): Exclude<EquipmentTab, "All"> {
  const eq = (ex.equipment || []).map((e) => e.toLowerCase()).join(" ");
  const name = ex.name.toLowerCase();
  const hay = `${eq} ${name}`;

  if (hay.includes("barbell") || hay.includes("olympic")) return "Barbell";
  if (hay.includes("dumbbell")) return "Dumbbell";
  if (hay.includes("kettle")) return "Kettlebell";
  if (
    hay.includes("cable") ||
    hay.includes("machine") ||
    hay.includes("smith") ||
    hay.includes("leg press") ||
    hay.includes("sled") ||
    hay.includes("hack")
  ) {
    return "Machine";
  }
  if (
    !eq.trim() ||
    eq.includes("none") ||
    hay.includes("bodyweight") ||
    hay.includes("body weight")
  ) {
    return "Bodyweight";
  }
  return "Other";
}

type ExercisePickerTabsProps = {
  exercises: CatalogExercise[];
  value: string;
  loggedNames?: string[];
  focusLabel?: string;
  /** Mood/energy suggestions — shown as first tab when present */
  recommendedNames?: string[];
  onSelect: (name: string) => void;
};

export function ExercisePickerTabs({
  exercises,
  value,
  loggedNames = [],
  focusLabel = "exercise",
  recommendedNames = [],
  onSelect,
}: ExercisePickerTabsProps) {
  const [query, setQuery] = useState("");
  const logged = useMemo(
    () => new Set(loggedNames.map((n) => n.toLowerCase())),
    [loggedNames],
  );

  const recommendedSet = useMemo(
    () => new Set(recommendedNames.map((n) => n.trim().toLowerCase()).filter(Boolean)),
    [recommendedNames],
  );

  const recommendedExercises = useMemo(() => {
    if (recommendedSet.size === 0) return [] as CatalogExercise[];
    const fromCatalog = exercises.filter((ex) =>
      recommendedSet.has(ex.name.toLowerCase()),
    );
    const found = new Set(fromCatalog.map((e) => e.name.toLowerCase()));
    // Keep mood list order; add stub rows for names not in catalog yet
    const ordered: CatalogExercise[] = [];
    for (const name of recommendedNames) {
      const hit = fromCatalog.find(
        (e) => e.name.toLowerCase() === name.trim().toLowerCase(),
      );
      if (hit) ordered.push(hit);
      else if (name.trim() && !found.has(name.trim().toLowerCase())) {
        ordered.push({
          name: name.trim(),
          imageUrl: null,
          videoUrl: null,
          primaryMuscles: [],
          secondaryMuscles: [],
          howTo: null,
          equipment: [],
        });
      }
    }
    return ordered;
  }, [exercises, recommendedNames, recommendedSet]);

  const byTab = useMemo(() => {
    const map = new Map<TabId, CatalogExercise[]>();
    map.set("Recommended", recommendedExercises);
    for (const tab of EQUIPMENT_TABS) map.set(tab, []);
    for (const ex of exercises) {
      map.get("All")!.push(ex);
      map.get(exerciseEquipmentTab(ex))!.push(ex);
    }
    return map;
  }, [exercises, recommendedExercises]);

  const visibleTabs = useMemo(() => {
    const tabs: TabId[] = [];
    if (recommendedExercises.length > 0) tabs.push("Recommended");
    for (const tab of EQUIPMENT_TABS) {
      if (tab === "All") {
        if (exercises.length > 0) tabs.push(tab);
        continue;
      }
      if ((byTab.get(tab)?.length || 0) > 0) tabs.push(tab);
    }
    return tabs;
  }, [byTab, exercises.length, recommendedExercises.length]);

  const defaultTab = visibleTabs[0] || "All";

  if (exercises.length === 0 && recommendedExercises.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No {focusLabel} exercises found
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${focusLabel} exercises…`}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
          {visibleTabs.map((tab) => {
            const count = byTab.get(tab)?.length || 0;
            return (
              <TabsTrigger
                key={tab}
                value={tab}
                className="px-2.5 py-1.5 text-xs sm:text-sm"
              >
                {tab === "Recommended" ? (
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Recommended
                  </span>
                ) : (
                  tab
                )}
                <span className="ml-1 text-muted-foreground">({count})</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {visibleTabs.map((tab) => {
          const q = query.trim().toLowerCase();
          const list = (byTab.get(tab) || []).filter((ex) =>
            q ? ex.name.toLowerCase().includes(q) : true,
          );

          return (
            <TabsContent key={tab} value={tab} className="mt-3 outline-none">
              <div
                className="max-h-56 overflow-y-auto rounded-md border bg-background"
                role="listbox"
                aria-label={`${focusLabel} exercises — ${tab}`}
              >
                {list.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">
                    No matches in {tab}
                  </p>
                ) : (
                  list.map((ex) => {
                    const alreadyLogged = logged.has(ex.name.toLowerCase());
                    const selected = value === ex.name;
                    const isRec = recommendedSet.has(ex.name.toLowerCase());
                    return (
                      <button
                        key={ex.name}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        disabled={alreadyLogged}
                        onClick={() => {
                          if (alreadyLogged) return;
                          onSelect(ex.name);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5 text-left text-sm last:border-b-0 transition-colors",
                          alreadyLogged
                            ? "cursor-not-allowed bg-muted/30 opacity-70"
                            : "hover:bg-muted/60",
                          selected && !alreadyLogged
                            ? "bg-primary/10 text-foreground"
                            : "text-foreground",
                        )}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                          {tab === "Recommended" || isRec ? (
                            <Sparkles className="h-3 w-3 shrink-0 text-primary" />
                          ) : null}
                          <span className="truncate">{ex.name}</span>
                        </span>
                        {alreadyLogged ? (
                          <span className="shrink-0 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                            Done
                          </span>
                        ) : selected ? (
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                        ) : ex.primaryMuscles?.length ||
                          ex.videoUrl ||
                          ex.imageUrl ? (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/70"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {tab === "Recommended"
                  ? "From your mood & energy — tap to select"
                  : "Scroll and tap to select"}
                {value ? ` · selected: ${value}` : ""}
              </p>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
