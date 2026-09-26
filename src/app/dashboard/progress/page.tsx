"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addProgressExercise,
  deleteProgressExercise,
  getExerciseCatalog,
  getExerciseDemo,
  getProgress,
  upsertProgressDay,
  type CatalogExercise,
  type ProgressDayView,
  type ProgressStats,
} from "@/api/progress";
import {
  FOCUS_PRESETS,
  exercisesForFocus,
  formatDayLabel,
  isFocusSaveLocked,
  isProgressDayLocked,
  lastNDateISOs,
  localDateISO,
  MAX_FOCUS_SAVES,
  remainingFocusSaves,
  resolveCatalogFocus,
  estimateExerciseMinutes,
  formatDurationMinutes,
} from "@/lib/progress-catalog";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/contexts/AuthContext";
import { AdminGymProgress } from "@/components/admin/AdminGymProgress";
import { SuperAdminPlatformProgress } from "@/components/admin/SuperAdminPlatformProgress";
import { TrainerProgressClients } from "@/components/trainer/TrainerProgressClients";
import { ExercisePickerTabs } from "@/components/progress/ExercisePickerTabs";
import {
  ExerciseSetSession,
  type ExerciseSessionPlan,
} from "@/components/progress/ExerciseSetSession";
import { ExerciseGuideVideoModal } from "@/components/progress/ExerciseGuideVideoModal";
import { ExerciseMediaTabs } from "@/components/progress/ExerciseMediaTabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Award,
  BarChart3,
  Clock,
  Dumbbell,
  Filter,
  Flame,
  Loader2,
  Lock,
  Plus,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

const emptyStats: ProgressStats = {
  trainedDays: 0,
  totalExercises: 0,
  totalSets: 0,
  totalDuration: 0,
  totalCalories: 0,
  streak: 0,
};

function emptyCatalog(name: string): CatalogExercise {
  return {
    name,
    imageUrl: null,
    videoUrl: null,
    primaryMuscles: [],
    secondaryMuscles: [],
    howTo: null,
    equipment: [],
  };
}

export default function ProgressPage() {
  const { isAdmin, isSuperAdmin, isTrainer, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  if (isSuperAdmin) {
    return <SuperAdminPlatformProgress />;
  }

  if (isAdmin) {
    return <AdminGymProgress />;
  }

  if (isTrainer) {
    return <TrainerProgressClients />;
  }

  return <MemberProgressPage />;
}

function MemberProgressPage() {
  const today = localDateISO();
  const defaultRange = lastNDateISOs(6);
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [dateFrom, setDateFrom] = useState(defaultRange[0]);
  const [dateTo, setDateTo] = useState(defaultRange[defaultRange.length - 1]);

  const [focusSelect, setFocusSelect] = useState("");
  const [focusCustom, setFocusCustom] = useState("");
  const [useCustomFocus, setUseCustomFocus] = useState(false);
  const [dayDuration, setDayDuration] = useState("");

  const [exSelect, setExSelect] = useState("");
  const [exCustom, setExCustom] = useState("");
  const [useCustomEx, setUseCustomEx] = useState(false);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("15");
  const [weight, setWeight] = useState("");
  const [setDuration, setSetDuration] = useState("45");
  const [sessionPlan, setSessionPlan] = useState<ExerciseSessionPlan | null>(null);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [guideVideoOpen, setGuideVideoOpen] = useState(false);
  const [guideVideoName, setGuideVideoName] = useState<string | null>(null);
  const [guideVideoMeta, setGuideVideoMeta] = useState<string | null>(null);
  const sessionSavingRef = useRef(false);
  const [exerciseOptions, setExerciseOptions] = useState<CatalogExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [catalogSource, setCatalogSource] = useState<string>("local");
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [youtubeTitle, setYoutubeTitle] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoSearchUrl, setDemoSearchUrl] = useState<string | null>(null);
  const [demoAnimationUrl, setDemoAnimationUrl] = useState<string | null>(null);
  const [demoVideoUrl, setDemoVideoUrl] = useState<string | null>(null);
  const [demoImageUrl, setDemoImageUrl] = useState<string | null>(null);
  const [demoInstructions, setDemoInstructions] = useState<string[]>([]);
  const [demoMediaSource, setDemoMediaSource] = useState<string | null>(null);

  const progressQuery = useQuery({
    queryKey: queryKeys.progress(dateFrom, dateTo),
    queryFn: () => getProgress({ from: dateFrom, to: dateTo }),
  });

  const days = progressQuery.data?.days ?? [];
  const stats = progressQuery.data?.stats ?? emptyStats;
  const loading = progressQuery.isPending && !progressQuery.data;

  const invalidateProgress = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.progress(dateFrom, dateTo) });

  useEffect(() => {
    if (!progressQuery.data?.days?.length) return;
    setSelectedDate((prev) => {
      if (progressQuery.data!.days.some((d) => d.date === prev)) return prev;
      return progressQuery.data!.days[progressQuery.data!.days.length - 1]?.date || today;
    });
  }, [progressQuery.data, today]);

  const selectedCatalogEx = useMemo(
    () => exerciseOptions.find((e) => e.name === exSelect) || null,
    [exerciseOptions, exSelect],
  );

  /** Name used for demo lookup: catalog selection or custom text. */
  const demoExerciseName = useMemo(() => {
    if (useCustomEx) return exCustom.trim();
    return (selectedCatalogEx?.name || "").trim();
  }, [useCustomEx, exCustom, selectedCatalogEx?.name]);

  const selectedDay = useMemo(
    () => days.find((d) => d.date === selectedDate) || null,
    [days, selectedDate],
  );

  /** Past days lock after 24h — customers can view history but not edit. */
  const selectedDayLocked = isProgressDayLocked(selectedDate);

  /** Focus can be set/changed twice, then locks for that day. */
  const focusSaveLocked =
    selectedDayLocked ||
    Boolean(selectedDay?.focus_locked) ||
    isFocusSaveLocked(selectedDay?.notes);

  const focusChancesLeft = remainingFocusSaves(selectedDay?.notes);

  /** Prefer the focus currently chosen in the form (Select/Custom), then saved day. */
  const activeFocus = useMemo(() => {
    if (selectedDayLocked || focusSaveLocked) {
      return (selectedDay?.focus || "").trim();
    }
    if (useCustomFocus) return focusCustom.trim();
    if (focusSelect.trim()) return focusSelect.trim();
    return (selectedDay?.focus || "").trim();
  }, [
    selectedDayLocked,
    focusSaveLocked,
    useCustomFocus,
    focusCustom,
    focusSelect,
    selectedDay?.focus,
  ]);

  /** Catalog category for related exercises (Legs, Chest, …). */
  const catalogFocus = useMemo(
    () => resolveCatalogFocus(activeFocus),
    [activeFocus],
  );

  useEffect(() => {
    if (
      selectedDayLocked ||
      !catalogFocus ||
      catalogFocus.toLowerCase() === "rest"
    ) {
      setExerciseOptions([]);
      setCatalogSource("local");
      setExSelect("");
      setLoadingExercises(false);
      return;
    }

    let cancelled = false;
    setLoadingExercises(true);
    setExerciseOptions(exercisesForFocus(catalogFocus).map(emptyCatalog));
    setExSelect("");

    getExerciseCatalog(catalogFocus)
      .then((data) => {
        if (cancelled) return;
        const list = data.exercises?.length
          ? data.exercises
          : exercisesForFocus(catalogFocus).map(emptyCatalog);
        setExerciseOptions(list);
        setCatalogSource(data.source || "local");
      })
      .catch(() => {
        if (cancelled) return;
        setExerciseOptions(exercisesForFocus(catalogFocus).map(emptyCatalog));
        setCatalogSource("local");
      })
      .finally(() => {
        if (!cancelled) setLoadingExercises(false);
      });

    return () => {
      cancelled = true;
    };
  }, [catalogFocus, selectedDayLocked]);

  /** Always pull form media (GIF animation + video) for the selected (or custom) exercise. */
  useEffect(() => {
    setYoutubeId(null);
    setYoutubeTitle(null);
    setDemoSearchUrl(null);
    setDemoAnimationUrl(null);
    setDemoVideoUrl(null);
    setDemoImageUrl(null);
    setDemoInstructions([]);
    setDemoMediaSource(null);

    if (selectedDayLocked || !demoExerciseName) {
      setLoadingDemo(false);
      return;
    }

    let cancelled = false;
    setLoadingDemo(true);

    const delayMs = useCustomEx ? 450 : 0;
    const timer = window.setTimeout(() => {
      getExerciseDemo(demoExerciseName)
        .then((data) => {
          if (cancelled) return;
          setYoutubeId(data.youtubeVideoId);
          setYoutubeTitle(data.title);
          setDemoSearchUrl(data.youtubeSearchUrl);
          setDemoAnimationUrl(data.animationUrl || null);
          setDemoVideoUrl(data.videoUrl || null);
          setDemoImageUrl(data.imageUrl || null);
          setDemoInstructions(data.instructions || []);
          setDemoMediaSource(data.mediaSource || null);
        })
        .catch(() => {
          if (cancelled) return;
          setYoutubeId(null);
          setDemoSearchUrl(
            `https://www.youtube.com/results?search_query=${encodeURIComponent(
              `${demoExerciseName} exercise proper form`,
            )}`,
          );
        })
        .finally(() => {
          if (!cancelled) setLoadingDemo(false);
        });
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [demoExerciseName, useCustomEx, selectedDayLocked]);

  const chartDays = useMemo(() => {
    return days.map((d) => {
      const label = new Date(`${d.date}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
      });
      const exerciseMinutes = d.exercises.reduce(
        (n, e) => n + estimateExerciseMinutes(e.sets),
        0,
      );
      return {
        date: d.date,
        label,
        focus: d.focus,
        workouts: d.focus && d.focus.toLowerCase() !== "rest" ? 1 : 0,
        calories: d.calories || d.exercises.reduce((n, e) => n + e.sets * 15, 0),
        duration: d.duration_minutes || exerciseMinutes,
        exercises: d.exercises.length,
      };
    });
  }, [days]);

  /** How many times each exercise was logged in the current date range. */
  const exerciseTimesDone = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of days) {
      for (const e of d.exercises) {
        const key = e.exercise_name.trim().toLowerCase();
        if (!key) continue;
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    return map;
  }, [days]);

  const totalWorkouts = stats.trainedDays;
  const totalCalories = stats.totalCalories || chartDays.reduce((s, d) => s + d.calories, 0);
  /** Always from logged exercises so Total Time updates on add/remove. */
  const totalDuration = useMemo(
    () =>
      days.reduce(
        (n, d) =>
          n +
          d.exercises.reduce(
            (s, e) => s + estimateExerciseMinutes(e.sets),
            0,
          ),
        0,
      ),
    [days],
  );

  const goals = useMemo(
    () => [
      {
        id: 1,
        name: "Workouts in range",
        current: stats.trainedDays,
        target: Math.max(days.length, 1),
        unit: "sessions",
      },
      {
        id: 2,
        name: "Exercises Logged",
        current: stats.totalExercises,
        target: Math.max(days.length * 3, 1),
        unit: "exercises",
      },
      {
        id: 3,
        name: "Total Sets",
        current: stats.totalSets,
        target: Math.max(days.length * 9, 1),
        unit: "sets",
      },
    ],
    [stats, days.length],
  );

  const applyQuickRange = (count: number) => {
    const range = lastNDateISOs(count);
    setDateFrom(range[0]);
    setDateTo(range[range.length - 1]);
  };

  useEffect(() => {
    if (!selectedDay) {
      setFocusSelect("");
      setFocusCustom("");
      setUseCustomFocus(false);
      setDayDuration("");
      return;
    }
    const isPreset = (FOCUS_PRESETS as readonly string[]).includes(selectedDay.focus);
    if (selectedDay.focus && !isPreset) {
      setUseCustomFocus(true);
      setFocusCustom(selectedDay.focus);
      setFocusSelect("");
    } else {
      setUseCustomFocus(false);
      setFocusSelect(selectedDay.focus || "");
      setFocusCustom("");
    }
    setDayDuration(
      selectedDay.duration_minutes != null ? String(selectedDay.duration_minutes) : "",
    );
    setExSelect("");
    setExCustom("");
    setUseCustomEx(false);
  }, [selectedDay?.date, selectedDay?.focus, selectedDay?.duration_minutes]);

  const saveDayFocus = async () => {
    if (isProgressDayLocked(selectedDate)) {
      toast.error("This day is locked — past workouts are view-only after 24 hours");
      return;
    }
    if (focusSaveLocked) {
      toast.error(
        `Focus is locked after ${MAX_FOCUS_SAVES} changes — you can still add exercises`,
      );
      return;
    }
    const focus = (useCustomFocus ? focusCustom : focusSelect).trim();
    if (!focus) {
      toast.error("Select a focus (e.g. Legs) or type a custom one");
      return;
    }
    setSaving(true);
    try {
      await upsertProgressDay({
        day_date: selectedDate,
        focus,
        calories: selectedDay?.calories ?? null,
        duration_minutes: dayDuration ? Number(dayDuration) : null,
      });
      const nextSaves = (selectedDay?.focus_saves ?? 0) + 1;
      const left = Math.max(0, MAX_FOCUS_SAVES - nextSaves);
      toast.success(
        left > 0
          ? `${formatDayLabel(selectedDate)} set to ${focus} · ${left} focus change left`
          : `${formatDayLabel(selectedDate)} set to ${focus} · focus locked`,
      );
      await invalidateProgress();
    } catch (err: any) {
      toast.error(err?.message || "Could not save day focus");
    } finally {
      setSaving(false);
    }
  };

  const addExercise = async () => {
    if (isProgressDayLocked(selectedDate)) {
      toast.error("This day is locked — past workouts are view-only after 24 hours");
      return;
    }
    const focus = (selectedDay?.focus || activeFocus).trim();
    if (!focus || focus.toLowerCase() === "rest") {
      toast.error("Select a day focus (e.g. Legs) first");
      return;
    }
    if (!selectedDay?.id && focusSaveLocked) {
      toast.error(
        `Focus is locked after ${MAX_FOCUS_SAVES} changes — save focus first on an open day`,
      );
      return;
    }
    const name = (useCustomEx ? exCustom : exSelect).trim();
    if (!name) {
      toast.error("Select or enter an exercise");
      return;
    }
    const alreadyLogged = (selectedDay?.exercises || []).some(
      (logged) => logged.exercise_name.toLowerCase() === name.toLowerCase(),
    );
    if (alreadyLogged) {
      toast.error("That exercise is already logged for this day");
      return;
    }
    const s = Number(sets);
    const r = Number(reps);
    const dur = Number(setDuration);
    if (!Number.isFinite(s) || s < 1 || !Number.isFinite(r) || r < 1) {
      toast.error("Enter valid sets and reps");
      return;
    }
    if (!Number.isFinite(dur) || dur < 5 || dur > 600) {
      toast.error("Duration: 5–600 seconds per set");
      return;
    }

    setSessionPlan({
      exerciseName: name,
      plannedSets: s,
      reps: r,
      weight: weight.trim() || null,
      durationSec: Math.round(dur),
    });
    setSessionOpen(true);
  };

  const openLoggedGuide = (ex: {
    exercise_name: string;
    sets: number;
    reps: number;
    weight: string | null;
  }) => {
    setGuideVideoName(ex.exercise_name);
    setGuideVideoMeta(
      `${ex.sets} sets × ${ex.reps} reps${ex.weight ? ` · ${ex.weight}` : ""}`,
    );
    setGuideVideoOpen(true);
  };

  const finishExerciseSession = async (completedSets: number) => {
    if (!sessionPlan) return;
    if (saving || sessionSavingRef.current) return;
    sessionSavingRef.current = true;
    const name = sessionPlan.exerciseName.trim();
    const alreadyLogged = (selectedDay?.exercises || []).some(
      (logged) => logged.exercise_name.toLowerCase() === name.toLowerCase(),
    );
    if (alreadyLogged) {
      toast.error("That exercise is already logged for this day");
      setSessionOpen(false);
      setSessionPlan(null);
      setExSelect("");
      sessionSavingRef.current = false;
      return;
    }

    const focus = (selectedDay?.focus || activeFocus).trim();
    setSaving(true);
    try {
      let dayId = selectedDay?.id;
      if (!dayId) {
        if (isFocusSaveLocked(selectedDay?.notes)) {
          toast.error(`Focus is locked after ${MAX_FOCUS_SAVES} changes`);
          return;
        }
        const { day } = await upsertProgressDay({
          day_date: selectedDate,
          focus,
          calories: selectedDay?.calories ?? null,
          duration_minutes: dayDuration ? Number(dayDuration) : null,
        });
        dayId = day.id;
      }

      await addProgressExercise({
        workout_day_id: dayId,
        exercise_name: name,
        sets: completedSets,
        reps: sessionPlan.reps,
        weight: sessionPlan.weight,
      });
      toast.success(`Added ${completedSets}×${sessionPlan.reps} ${name}`);
      setExSelect("");
      setExCustom("");
      setWeight("");
      setSessionOpen(false);
      setSessionPlan(null);
      await invalidateProgress();
    } catch (err: any) {
      const msg = err?.message || "Could not add exercise";
      toast.error(msg);
      if (/already logged/i.test(msg)) {
        setSessionOpen(false);
        setSessionPlan(null);
        setExSelect("");
        await invalidateProgress();
      }
    } finally {
      setSaving(false);
      sessionSavingRef.current = false;
    }
  };

  const removeExercise = async (id: string) => {
    if (isProgressDayLocked(selectedDate)) {
      toast.error("This day is locked — past workouts are view-only after 24 hours");
      return;
    }
    setSaving(true);
    try {
      await deleteProgressExercise(id);
      await invalidateProgress();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete exercise");
    } finally {
      setSaving(false);
    }
  };

  const maxCalories = Math.max(1, ...chartDays.map((d) => d.calories));

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
        <p className="text-muted-foreground mt-2">
          Track your fitness journey and achievements
        </p>
      </div>

      {/* Date filters — top only */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Filter progress by date</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
        <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyQuickRange(6)}
            >
              Last 6 days
        </Button>
        <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyQuickRange(7)}
            >
              This week
        </Button>
        <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyQuickRange(30)}
            >
              This month
        </Button>
      </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                min={dateFrom}
                max={today}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview — original design */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Workouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totalWorkouts}</div>
              <Dumbbell className="h-5 w-5 text-primary opacity-20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              {stats.totalExercises} exercises logged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Calories Burned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totalCalories.toLocaleString()}</div>
              <Flame className="h-5 w-5 text-primary opacity-20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              From logged sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{formatDurationMinutes(totalDuration)}</div>
              <Clock className="h-5 w-5 text-primary opacity-20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              {stats.totalSets} total sets · updates with logs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.streak} days</div>
              <Award className="h-5 w-5 text-primary opacity-20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.streak > 0 ? "Keep it going!" : "Log today to start"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity Chart — original design, dynamic data */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Weekly Activity
          </CardTitle>
          <CardDescription>Your workout activity over the past week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-48">
            {chartDays.length === 0 ? (
              <p className="text-sm text-muted-foreground self-center mx-auto">
                No activity yet — set a day focus below
              </p>
            ) : (
              chartDays.map((day) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className="flex-1 flex flex-col items-center gap-2 group"
                >
                  <div
                    className={`w-full rounded-t-lg transition-all ${
                      day.date === selectedDate
                        ? "bg-primary"
                        : "bg-primary/70 group-hover:bg-primary/90"
                    }`}
                  style={{ 
                      height: `${(day.calories / maxCalories) * 100}%`,
                      minHeight: day.workouts > 0 || day.exercises > 0 ? "20px" : "4px",
                  }}
                />
                <div className="text-xs text-center">
                    <p className="font-medium">{day.label}</p>
                    <p className="text-muted-foreground truncate max-w-full">
                      {day.focus || `${day.calories} kcal`}
                    </p>
                </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mb-8">
        {/* Goals Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goals Progress
            </CardTitle>
            <CardDescription>Track your fitness goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {goals.map((goal) => {
              const progress = Math.min(100, (goal.current / goal.target) * 100);
              return (
                <div key={goal.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{goal.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {goal.current}/{goal.target} {goal.unit}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {progress.toFixed(0)}% complete
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Merged: day focus + exercises (one section) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Today&apos;s workout
            {catalogFocus ? (
              <Badge variant="outline" className="ml-1">
                {catalogFocus}
              </Badge>
            ) : null}
            </CardTitle>
          <CardDescription>
            {selectedDayLocked
              ? "This day is locked (past 24 hours) — view what you logged only"
              : focusSaveLocked
                ? `Focus locked after ${MAX_FOCUS_SAVES} changes — add related exercises below`
                : `Pick a day, set focus (Legs, Chest…) — ${MAX_FOCUS_SAVES} focus changes max, then add exercises`}
            {!selectedDayLocked && !focusSaveLocked && loadingExercises
              ? " · loading exercises…"
              : !selectedDayLocked &&
                  catalogSource.includes("wger") &&
                  catalogFocus
                ? " · via wger.de"
                : ""}
          </CardDescription>
          </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {days.length === 0 ? (
              <p className="col-span-full text-sm text-muted-foreground">
                No days in this date range.
              </p>
            ) : (
              days.map((day) => {
                const active = day.date === selectedDate;
                const locked = isProgressDayLocked(day.date);
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/10"
                        : locked
                          ? "border-border/60 bg-muted/30 opacity-90 hover:border-muted-foreground/40"
                          : "hover:border-primary/50"
                    }`}
                  >
                    <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      {locked ? <Lock className="h-3 w-3 shrink-0" aria-hidden /> : null}
                      {formatDayLabel(day.date, today)}
                    </p>
                    <p className="mt-1 font-medium">{day.focus || "Not set"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {locked
                        ? day.exercises.length > 0
                          ? `${day.exercises.length} exercise${day.exercises.length === 1 ? "" : "s"} · locked`
                          : "Locked"
                        : day.focus_locked
                          ? `${day.exercises.length} exercise${day.exercises.length === 1 ? "" : "s"} · focus locked`
                          : `${day.exercises.length} exercise${day.exercises.length === 1 ? "" : "s"}`}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {selectedDayLocked ? (
            <div className="space-y-4 rounded-lg border border-dashed p-4">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {formatDayLabel(selectedDate, today)} — view only
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Past days lock after 24 hours. You can still see what you logged.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Focus</p>
                  <p className="mt-0.5 font-medium">
                    {selectedDay?.focus || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="mt-0.5 font-medium">
                    {selectedDay?.duration_minutes != null
                      ? `${selectedDay.duration_minutes} min`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">
                Focus for {formatDayLabel(selectedDate, today)}
              </p>
              <p className="text-xs text-muted-foreground">
                {focusSaveLocked
                  ? "Focus locked"
                  : selectedDay?.focus
                    ? `${focusChancesLeft} change${focusChancesLeft === 1 ? "" : "s"} left`
                    : `${MAX_FOCUS_SAVES} chances to set focus`}
              </p>
            </div>

            {focusSaveLocked ? (
              <div className="flex items-start gap-2 rounded-md border border-dashed p-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedDay?.focus || "Not set"}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Focus can&apos;t be changed again. Related{" "}
                    {catalogFocus || "workout"} exercises are below.
                  </p>
                </div>
              </div>
            ) : (
              <>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={!useCustomFocus ? "default" : "outline"}
                onClick={() => setUseCustomFocus(false)}
              >
                Select
              </Button>
              <Button
                type="button"
                size="sm"
                variant={useCustomFocus ? "default" : "outline"}
                onClick={() => setUseCustomFocus(true)}
              >
                Custom
              </Button>
            </div>
            {!useCustomFocus ? (
              <select
                value={focusSelect}
                onChange={(e) => setFocusSelect(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select focus…</option>
                {FOCUS_PRESETS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="e.g. Games, Push day, HIIT"
                value={focusCustom}
                onChange={(e) => setFocusCustom(e.target.value)}
              />
            )}
            <div className="space-y-2">
              <Label htmlFor="dayDuration">Duration (min)</Label>
              <Input
                id="dayDuration"
                type="number"
                min={0}
                value={dayDuration}
                onChange={(e) => setDayDuration(e.target.value)}
                placeholder="60"
              />
            </div>
              </>
            )}

            {!catalogFocus || catalogFocus.toLowerCase() === "rest" ? (
              <p className="text-sm text-muted-foreground">
                {catalogFocus?.toLowerCase() === "rest"
                  ? "Rest day — no exercises to log."
                  : "Select a focus to load matching exercises below."}
              </p>
            ) : (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium">
                  Exercises — {catalogFocus}
                  {!loadingExercises && exerciseOptions.length > 0 ? (
                    <span className="ml-2 font-normal text-muted-foreground">
                      ({exerciseOptions.length} loaded
                      {catalogSource.includes("wger") ? " from wger.de" : ""})
                    </span>
                  ) : null}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={!useCustomEx ? "default" : "outline"}
                    onClick={() => setUseCustomEx(false)}
                  >
                    Select
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={useCustomEx ? "default" : "outline"}
                    onClick={() => setUseCustomEx(true)}
                  >
                    Custom
                  </Button>
                </div>
                {!useCustomEx ? (
                  loadingExercises ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading {catalogFocus} exercises…
                    </p>
                  ) : (
                    <ExercisePickerTabs
                      exercises={exerciseOptions}
                      value={exSelect}
                      focusLabel={catalogFocus}
                      loggedNames={(selectedDay?.exercises || []).map(
                        (e) => e.exercise_name,
                      )}
                      onSelect={setExSelect}
                    />
                  )
                ) : (
                  <Input
                    placeholder="Custom exercise name"
                    value={exCustom}
                    onChange={(e) => setExCustom(e.target.value)}
                  />
                )}

                {demoExerciseName ? (
                  <div className="space-y-3 overflow-hidden rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-semibold">{demoExerciseName}</p>
                      {!useCustomEx && selectedCatalogEx?.equipment?.length ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Equipment: {selectedCatalogEx.equipment.join(", ")}
                        </p>
                      ) : null}
                    </div>

                    {/* Effects — muscles worked */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Effects
                      </p>
                      {!useCustomEx &&
                      (selectedCatalogEx?.primaryMuscles?.length ||
                        selectedCatalogEx?.secondaryMuscles?.length) ? (
                        <div className="space-y-2">
                          {selectedCatalogEx.primaryMuscles.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedCatalogEx.primaryMuscles.map((m) => (
                                <Badge key={m} variant="default">
                                  {m}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                          {selectedCatalogEx.secondaryMuscles.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">
                                Also:
                              </span>
                              {selectedCatalogEx.secondaryMuscles.map((m) => (
                                <Badge key={m} variant="outline">
                                  {m}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {useCustomEx
                            ? "Muscle effects unavailable for custom exercises"
                            : "No muscle effects listed for this exercise"}
                        </p>
                      )}
                    </div>

                    {/* How to do — steps */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        How to do
                      </p>
                      {!useCustomEx && selectedCatalogEx?.howTo ? (
                        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                          {selectedCatalogEx.howTo}
                        </p>
                      ) : demoInstructions.length > 0 ? (
                        <ol className="list-decimal space-y-1 pl-4 text-sm leading-relaxed text-foreground/90">
                          {demoInstructions.map((step, i) => (
                            <li key={i}>
                              {step.replace(/^Step:\s*\d+\s*/i, "").trim()}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Watch the animation or video below for form guidance.
                        </p>
                      )}
                    </div>

                    <ExerciseMediaTabs
                      loading={loadingDemo}
                      exerciseName={demoExerciseName}
                      animationUrl={demoAnimationUrl}
                      videoUrl={
                        demoVideoUrl ||
                        (!useCustomEx ? selectedCatalogEx?.videoUrl : null) ||
                        null
                      }
                      youtubeVideoId={youtubeId}
                      youtubeTitle={youtubeTitle}
                      youtubeSearchUrl={demoSearchUrl}
                      posterUrl={
                        demoImageUrl ||
                        (!useCustomEx ? selectedCatalogEx?.imageUrl : null) ||
                        null
                      }
                      attribution={
                        demoMediaSource === "workoutdb"
                          ? "Media: WorkoutDB"
                          : demoMediaSource
                            ? "Media: ExerciseDB"
                            : null
                      }
                    />
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Sets</Label>
                    <Input
                      type="number"
                      min={1}
                      value={sets}
                      onChange={(e) => setSets(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reps</Label>
                    <Input
                      type="number"
                      min={1}
                      value={reps}
                      onChange={(e) => setReps(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight</Label>
                    <Input
                      placeholder="e.g. 50 kg"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (sec)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={600}
                      placeholder="per set"
                      value={setDuration}
                      onChange={(e) => setSetDuration(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Add exercise starts a timer per set, then a 2‑min breath rest between sets.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {!focusSaveLocked ? (
                <Button
                  onClick={() => void saveDayFocus()}
                  disabled={saving}
                  variant="outline"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save focus
                </Button>
              ) : null}
              {catalogFocus && catalogFocus.toLowerCase() !== "rest" ? (
                <Button
                  onClick={() => void addExercise()}
                  disabled={saving || loadingExercises}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add exercise
                </Button>
              ) : null}
            </div>
          </div>
          )}

          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">
              Logged for {formatDayLabel(selectedDate, today)}
              {selectedDayLocked ? " (locked)" : ""}
            </p>
            {(selectedDay?.exercises || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {selectedDayLocked
                  ? "Nothing was logged for this day."
                  : "No exercises yet for this day."}
              </p>
            ) : (
              selectedDay!.exercises.map((ex) => {
                const timesDone =
                  exerciseTimesDone.get(ex.exercise_name.trim().toLowerCase()) ||
                  1;
                const mins = estimateExerciseMinutes(ex.sets);
                return (
                <div
                  key={ex.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openLoggedGuide(ex)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openLoggedGuide(ex);
                    }
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">{ex.exercise_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {ex.sets} sets × {ex.reps} reps
                      {ex.weight ? ` · ${ex.weight}` : ""}
                      {" · "}
                      ~{formatDurationMinutes(mins)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Done {timesDone}× in this range · tap for how-to video
                    </p>
                  </div>
                  {!selectedDayLocked ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeExercise(ex.id);
                      }}
                      disabled={saving}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  ) : null}
                </div>
              );
              })
            )}
            </div>
          </CardContent>
        </Card>

      <ExerciseSetSession
        open={sessionOpen}
        plan={sessionPlan}
        saving={saving}
        onCancel={() => {
          if (saving) return;
          setSessionOpen(false);
          setSessionPlan(null);
        }}
        onFinish={(completedSets) => void finishExerciseSession(completedSets)}
      />
      <ExerciseGuideVideoModal
        open={guideVideoOpen}
        exerciseName={guideVideoName}
        meta={guideVideoMeta}
        onClose={() => {
          setGuideVideoOpen(false);
          setGuideVideoName(null);
          setGuideVideoMeta(null);
        }}
      />
    </div>
  );
}
