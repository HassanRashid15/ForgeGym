"use client";

import { useMemo, useState } from "react";
import type { CatalogExercise } from "@/api/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const TAB_ORDER = [
  "All",
  "Barbell",
  "Dumbbell",
  "Kettlebell",
  "Machine",
  "Bodyweight",
  "Other",
] as const;

type TabId = (typeof TAB_ORDER)[number];

function exerciseEquipmentTab(ex: CatalogExercise): Exclude<TabId, "All"> {
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
  onSelect: (name: string) => void;
};

export function ExercisePickerTabs({
  exercises,
  value,
  loggedNames = [],
  focusLabel = "exercise",
  onSelect,
}: ExercisePickerTabsProps) {
  const [query, setQuery] = useState("");
  const logged = useMemo(
    () => new Set(loggedNames.map((n) => n.toLowerCase())),
    [loggedNames],
  );

  const byTab = useMemo(() => {
    const map = new Map<TabId, CatalogExercise[]>();
    for (const tab of TAB_ORDER) map.set(tab, []);
    for (const ex of exercises) {
      map.get("All")!.push(ex);
      map.get(exerciseEquipmentTab(ex))!.push(ex);
    }
    return map;
  }, [exercises]);

  const visibleTabs = useMemo(() => {
    return TAB_ORDER.filter((tab) => {
      if (tab === "All") return exercises.length > 0;
      return (byTab.get(tab)?.length || 0) > 0;
    });
  }, [byTab, exercises.length]);

  const defaultTab = visibleTabs[0] || "All";

  if (exercises.length === 0) {
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
                {tab}
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
                        <span className="min-w-0 flex-1 truncate">{ex.name}</span>
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
                Scroll and tap to select
                {value ? ` · selected: ${value}` : ""}
              </p>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
