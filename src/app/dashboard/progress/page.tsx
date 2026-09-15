"use client";

import { useEffect, useMemo, useState } from "react";
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
  lastNDateISOs,
  localDateISO,
} from "@/lib/progress-catalog";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/contexts/AuthContext";
import { AdminGymProgress } from "@/components/admin/AdminGymProgress";
import { SuperAdminPlatformProgress } from "@/components/admin/SuperAdminPlatformProgress";
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
  const { isAdmin, isSuperAdmin, isLoading: authLoading } = useAuth();

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
  const [dayCalories, setDayCalories] = useState("");
  const [dayDuration, setDayDuration] = useState("");

  const [exSelect, setExSelect] = useState("");
  const [exCustom, setExCustom] = useState("");
  const [useCustomEx, setUseCustomEx] = useState(false);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("15");
  const [weight, setWeight] = useState("");
  const [exerciseOptions, setExerciseOptions] = useState<CatalogExercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [catalogSource, setCatalogSource] = useState<string>("local");
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [youtubeTitle, setYoutubeTitle] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoSearchUrl, setDemoSearchUrl] = useState<string | null>(null);

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

  /** Prefer the focus currently chosen in the form (Select/Custom), then saved day. */
  const activeFocus = useMemo(() => {
    if (useCustomFocus) return focusCustom.trim();
    if (focusSelect.trim()) return focusSelect.trim();
    return (selectedDay?.focus || "").trim();
  }, [useCustomFocus, focusCustom, focusSelect, selectedDay?.focus]);

  useEffect(() => {
    if (!activeFocus || activeFocus.toLowerCase() === "rest") {
      setExerciseOptions([]);
      setCatalogSource("local");
      setExSelect("");
      setLoadingExercises(false);
      return;
    }

    let cancelled = false;
    setLoadingExercises(true);
    setExerciseOptions(exercisesForFocus(activeFocus).map(emptyCatalog));
    setExSelect("");

    getExerciseCatalog(activeFocus)
      .then((data) => {
        if (cancelled) return;
        const list = data.exercises?.length
          ? data.exercises
          : exercisesForFocus(activeFocus).map(emptyCatalog);
        setExerciseOptions(list);
        setCatalogSource(data.source || "local");
      })
      .catch(() => {
        if (cancelled) return;
        setExerciseOptions(exercisesForFocus(activeFocus).map(emptyCatalog));
        setCatalogSource("local");
      })
      .finally(() => {
        if (!cancelled) setLoadingExercises(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFocus]);

  /** Always pull a YouTube how-to video for the selected (or custom) exercise. */
  useEffect(() => {
    setYoutubeId(null);
    setYoutubeTitle(null);
    setDemoSearchUrl(null);

    if (!demoExerciseName) {
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
  }, [demoExerciseName, useCustomEx]);

  const chartDays = useMemo(() => {
    return days.map((d) => {
      const label = new Date(`${d.date}T12:00:00`).toLocaleDateString("en-US", {
        weekday: "short",
      });
      return {
        date: d.date,
        label,
        focus: d.focus,
        workouts: d.focus && d.focus.toLowerCase() !== "rest" ? 1 : 0,
        calories: d.calories || d.exercises.reduce((n, e) => n + e.sets * 15, 0),
        duration: d.duration_minutes || d.exercises.reduce((n, e) => n + e.sets * 3, 0),
        exercises: d.exercises.length,
      };
    });
  }, [days]);

  const totalWorkouts = stats.trainedDays;
  const totalCalories = stats.totalCalories || chartDays.reduce((s, d) => s + d.calories, 0);
  const totalDuration = stats.totalDuration || chartDays.reduce((s, d) => s + d.duration, 0);

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
      setDayCalories("");
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
    setDayCalories(selectedDay.calories != null ? String(selectedDay.calories) : "");
    setDayDuration(
      selectedDay.duration_minutes != null ? String(selectedDay.duration_minutes) : "",
    );
    setExSelect("");
    setExCustom("");
    setUseCustomEx(false);
  }, [selectedDay?.date, selectedDay?.focus, selectedDay?.calories, selectedDay?.duration_minutes]);

  const saveDayFocus = async () => {
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
        calories: dayCalories ? Number(dayCalories) : null,
        duration_minutes: dayDuration ? Number(dayDuration) : null,
      });
      toast.success(`${formatDayLabel(selectedDate)} set to ${focus}`);
      await invalidateProgress();
    } catch (err: any) {
      toast.error(err?.message || "Could not save day focus");
    } finally {
      setSaving(false);
    }
  };

  const addExercise = async () => {
    const focus = activeFocus;
    if (!focus || focus.toLowerCase() === "rest") {
      toast.error("Select a day focus (e.g. Legs) first");
      return;
    }
    const name = (useCustomEx ? exCustom : exSelect).trim();
    if (!name) {
      toast.error("Select or enter an exercise");
      return;
    }
    const s = Number(sets);
    const r = Number(reps);
    if (!Number.isFinite(s) || s < 1 || !Number.isFinite(r) || r < 1) {
      toast.error("Enter valid sets and reps");
      return;
    }
    setSaving(true);
    try {
      let dayId = selectedDay?.id;
      if (!dayId) {
        const { day } = await upsertProgressDay({
          day_date: selectedDate,
          focus,
          calories: dayCalories ? Number(dayCalories) : null,
          duration_minutes: dayDuration ? Number(dayDuration) : null,
        });
        dayId = day.id;
      }

      await addProgressExercise({
        workout_day_id: dayId,
        exercise_name: name,
        sets: s,
        reps: r,
        weight: weight.trim() || null,
      });
      toast.success(`Added ${s}×${r} ${name}`);
      setExSelect("");
      setExCustom("");
      setWeight("");
      await invalidateProgress();
    } catch (err: any) {
      toast.error(err?.message || "Could not add exercise");
    } finally {
      setSaving(false);
    }
  };

  const removeExercise = async (id: string) => {
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
              <div className="text-2xl font-bold">{totalDuration}m</div>
              <Clock className="h-5 w-5 text-primary opacity-20" />
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              {stats.totalSets} total sets
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
            {activeFocus ? (
              <Badge variant="outline" className="ml-1">
                {activeFocus}
              </Badge>
            ) : null}
            </CardTitle>
          <CardDescription>
            Pick a day, set focus (Legs, Chest…), then add exercises with sets &amp; reps
            {loadingExercises
              ? " · loading exercises…"
              : catalogSource.includes("wger") && activeFocus
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
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      active ? "border-primary bg-primary/10" : "hover:border-primary/50"
                    }`}
                  >
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatDayLabel(day.date, today)}
                    </p>
                    <p className="mt-1 font-medium">{day.focus || "Not set"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {day.exercises.length} exercise
                      {day.exercises.length === 1 ? "" : "s"}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <p className="font-medium">
              Focus for {formatDayLabel(selectedDate, today)}
            </p>
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
            <div className="grid gap-3 sm:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="dayCalories">Calories</Label>
                <Input
                  id="dayCalories"
                  type="number"
                  min={0}
                  value={dayCalories}
                  onChange={(e) => setDayCalories(e.target.value)}
                  placeholder="400"
                />
              </div>
            </div>

            {!activeFocus || activeFocus.toLowerCase() === "rest" ? (
              <p className="text-sm text-muted-foreground">
                {activeFocus?.toLowerCase() === "rest"
                  ? "Rest day — no exercises to log."
                  : "Select a focus to load matching exercises below."}
              </p>
            ) : (
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-medium">
                  Exercises — {activeFocus}
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
                      Loading {activeFocus} exercises…
                    </p>
                  ) : (
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={exSelect}
                      onChange={(e) => setExSelect(e.target.value)}
                      disabled={exerciseOptions.length === 0}
                    >
                      <option value="">
                        {exerciseOptions.length === 0
                          ? `No ${activeFocus} exercises found`
                          : `Select ${activeFocus} exercise`}
                      </option>
                        {exerciseOptions.map((ex) => (
                        <option key={ex.name} value={ex.name}>
                          {ex.name}
                          {ex.primaryMuscles?.length || ex.videoUrl || ex.imageUrl
                            ? " ●"
                            : ""}
                        </option>
                      ))}
                    </select>
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
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Watch the how-to video below for form guidance.
                        </p>
                      )}
                    </div>

                    {/* How to video */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        How to video
                      </p>
                      <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
                        {loadingDemo ? (
                          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Finding how-to video…
                          </div>
                        ) : youtubeId ? (
                          <iframe
                            key={youtubeId}
                            title={youtubeTitle || `How to do ${demoExerciseName}`}
                            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`}
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : !useCustomEx && selectedCatalogEx?.videoUrl ? (
                          <video
                            key={selectedCatalogEx.videoUrl}
                            src={selectedCatalogEx.videoUrl}
                            poster={selectedCatalogEx.imageUrl || undefined}
                            controls
                            muted
                            playsInline
                            loop
                            autoPlay
                            className="h-full w-full object-contain bg-black"
                          />
                        ) : !useCustomEx && selectedCatalogEx?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selectedCatalogEx.imageUrl}
                            alt={selectedCatalogEx.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                            <Dumbbell className="h-8 w-8 text-muted-foreground/40" />
                            <span>No how-to video found</span>
                            {demoSearchUrl ? (
                              <a
                                href={demoSearchUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline-offset-2 hover:underline"
                              >
                                Search on YouTube
                              </a>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="grid grid-cols-3 gap-3">
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
                      placeholder="optional"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={() => void saveDayFocus()} disabled={saving} variant="outline">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save focus
              </Button>
              {activeFocus && activeFocus.toLowerCase() !== "rest" ? (
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

          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">
              Logged for {formatDayLabel(selectedDate, today)}
            </p>
            {(selectedDay?.exercises || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No exercises yet for this day.</p>
            ) : (
              selectedDay!.exercises.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{ex.exercise_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {ex.sets} sets × {ex.reps} reps
                      {ex.weight ? ` · ${ex.weight}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => void removeExercise(ex.id)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))
            )}
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
