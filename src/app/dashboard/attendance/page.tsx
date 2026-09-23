"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TableRowSkeleton } from "@/components/loading/TableRowSkeleton";
import { getNameInitials } from "@/lib/utils";
import {
  ATTENDANCE_SLOT_HOURS,
  formatSlotLabel,
  slotsForGender,
  type AttendanceSlot,
} from "@/lib/attendance";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Moon,
  Sun,
  Sunset,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import {
  checkInAttendance,
  checkOutAttendance,
  listAttendance,
} from "@/api/attendance";
import { ApiError } from "@/api/client";

type AttendanceRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  gender: string | null;
  role: string;
  slot: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  source: string;
  open: boolean;
};

type Meta = {
  gender: string | null;
  role: string;
  currentSlot: AttendanceSlot | null;
  allowedSlots: AttendanceSlot[];
  canCheckInNow: boolean;
  canViewGym: boolean;
  gymOpen: boolean;
  closedMessage: string | null;
  genderRequired: boolean;
  genderError: string | null;
  geoRequired: boolean;
  geoRadiusM: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type RoleFilter = "all" | "customer" | "trainer" | "admin";

const ROLE_FILTERS: { id: RoleFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "customer", label: "Customer" },
  { id: "trainer", label: "Trainer" },
  { id: "admin", label: "Gym owner" },
];

const SLOT_ICON = {
  morning: Sun,
  afternoon: Sunset,
  evening: Moon,
} as const;

function formatElapsed(startIso: string, nowMs: number, endIso?: string | null) {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : nowMs;
  const totalSec = Math.max(0, Math.floor((end - start) / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const hms = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return days > 0 ? `${days}d ${hms}` : hms;
}

function formatDurationLabel(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const totalSec = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  if (mins > 0) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  return `${secs}s`;
}

function formatVisitWhen(iso: string) {
  return format(new Date(iso), "EEE · MMM d · HH:mm");
}

function matchesRoleFilter(role: string, filter: RoleFilter): boolean {
  if (filter === "all") return true;
  if (filter === "admin") return role === "admin";
  if (filter === "trainer") return role === "trainer";
  return (
    role === "customer" ||
    role === "user" ||
    role === "staff" ||
    role === "moderator"
  );
}

async function readGps(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30_000 },
    );
  });
}

export default function AttendancePage() {
  const { isAdmin, user } = useAuth();
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const canViewGym = meta?.canViewGym ?? isAdmin;

  const load = useCallback(async () => {
    const data = await listAttendance({
      scope: isAdmin ? "gym" : "me",
      page,
      pageSize: 25,
      role: isAdmin && roleFilter !== "all" ? roleFilter : undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    });
    setRows((data.checkins || []) as AttendanceRow[]);
    setMeta((data.meta || null) as Meta | null);
  }, [isAdmin, page, roleFilter, fromDate, toDate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const openRows = useMemo(() => {
    const list = rows.filter((r) => r.open);
    if (!canViewGym || roleFilter === "all") return list;
    return list.filter((r) => matchesRoleFilter(r.role, roleFilter));
  }, [rows, canViewGym, roleFilter]);

  const completedRows = useMemo(() => {
    const list = rows.filter((r) => !r.open && r.checked_out_at);
    if (!canViewGym || roleFilter === "all") return list;
    return list.filter((r) => matchesRoleFilter(r.role, roleFilter));
  }, [rows, canViewGym, roleFilter]);

  const myOpen = useMemo(
    () => rows.find((r) => r.user_id === user?.id && r.open) || null,
    [rows, user?.id],
  );

  useEffect(() => {
    if (openRows.length === 0) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [openRows.length]);

  const allowedSlots = meta?.allowedSlots?.length
    ? meta.allowedSlots
    : slotsForGender(meta?.gender);
  const currentSlot = meta?.currentSlot;
  const myElapsed = myOpen
    ? formatElapsed(myOpen.checked_in_at, nowMs)
    : null;
  const totalPages = meta?.pagination?.totalPages || 1;

  async function checkIn() {
    if (meta?.genderRequired) {
      toast.error(meta.genderError || "Set gender in Profile first");
      return;
    }
    if (meta?.gymOpen === false) {
      toast.error(meta.closedMessage || "Gym closed for attendance");
      return;
    }

    setBusy(true);
    try {
      const gps = await readGps();
      const data = await checkInAttendance({
        source: "manual",
        lat: gps?.lat,
        lng: gps?.lng,
      });
      if (data.needsCheckout) {
        toast.message("Already checked in — check out first");
      } else {
        toast.success(
          `Checked in · ${formatSlotLabel(
            (data.checkin?.slot as AttendanceSlot | null | undefined) ?? null,
          )}${data.presenceMethod ? ` · via ${data.presenceMethod}` : ""}`,
        );
      }
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Check-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function checkOut() {
    if (!myOpen) return;
    const spent = formatElapsed(myOpen.checked_in_at, Date.now());
    setBusy(true);
    try {
      await checkOutAttendance({ id: myOpen.id });
      toast.success(`Checked out · spent ${spent}`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Check-out failed");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const params = new URLSearchParams();
    params.set("scope", "gym");
    params.set("format", "csv");
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    window.location.href = `/api/attendance?${params}`;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Clock className="h-6 w-6 text-primary" />
            Attendance
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {canViewGym
              ? "All gym check-ins — filter, date range, and export. Presence via GPS or today's code."
              : "Your visits only. Check in near the gym (GPS) or with today's desk code."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {myOpen && myElapsed ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Time in gym
              </p>
              <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
                {myElapsed}
              </p>
            </div>
          ) : null}
          {myOpen ? (
            <Button
              onClick={() => void checkOut()}
              disabled={busy}
              variant="outline"
              className="gap-2"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Check out
            </Button>
          ) : (
            <Button
              onClick={() => void checkIn()}
              disabled={
                busy ||
                meta?.canCheckInNow === false ||
                meta?.genderRequired === true
              }
              className="gap-2"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Check in
              {currentSlot ? ` · ${formatSlotLabel(currentSlot)}` : ""}
            </Button>
          )}
        </div>
      </div>

      {meta?.closedMessage ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          {meta.closedMessage}
        </p>
      ) : null}

      {meta?.genderRequired ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {meta.genderError}{" "}
          <Link href="/profile" className="underline">
            Open profile
          </Link>
        </p>
      ) : null}

      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4 text-primary" />
            Location check
          </p>
          <p className="text-sm text-muted-foreground">
            {meta?.geoRequired
              ? `GPS must be within ~${meta.geoRadiusM}m of the gym to check in.`
              : "Gym GPS not set — check-in is blocked until the owner sets location."}
          </p>
          {!meta?.geoRequired && (
            <p className="text-xs text-muted-foreground">
              Gym owner: set location in{" "}
              <Link
                href="/profile?tab=gym"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Profile → Gym
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["morning", "afternoon", "evening"] as AttendanceSlot[]).map(
          (slot) => {
            const allowed = allowedSlots.includes(slot);
            const active = currentSlot === slot;
            const Icon = SLOT_ICON[slot];
            const hours = ATTENDANCE_SLOT_HOURS[slot];
            return (
              <Card
                key={slot}
                className={
                  active
                    ? "border-primary/50 bg-primary/5"
                    : allowed
                      ? ""
                      : "opacity-50"
                }
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon
                    className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <div className="min-w-0">
                    <p className="font-medium">{hours.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {String(hours.startHour).padStart(2, "0")}:00–
                      {String(hours.endHour).padStart(2, "0")}:59
                      {!allowed ? " · not for your gender" : ""}
                      {active ? " · now" : ""}
                    </p>
                  </div>
                  {allowed ? (
                    <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-500" />
                  ) : null}
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Female: morning, afternoon, evening. Male: morning and evening only.
        Closed 00:00–04:59 (intended). Times use Asia/Karachi unless
        ATTENDANCE_TZ is set.
      </p>

      {canViewGym ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {ROLE_FILTERS.map((f) => (
              <Button
                key={f.id}
                type="button"
                size="sm"
                variant={roleFilter === f.id ? "default" : "outline"}
                onClick={() => {
                  setRoleFilter(f.id);
                  setPage(1);
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-auto"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-auto"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={exportCsv}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            {canViewGym ? "Currently in gym" : "Your active session"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableRowSkeleton rows={3} columns={6} />
          ) : openRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {canViewGym
                ? "Nobody is checked in right now."
                : "You are not checked in."}
            </p>
          ) : (
            <AttendanceTable rows={openRows} nowMs={nowMs} mode="active" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {canViewGym ? "Completed visits" : "Your past visits"}
          </CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Check-out history with how long each visit lasted.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <TableRowSkeleton rows={4} columns={7} />
          ) : completedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No completed visits for this filter yet.
            </p>
          ) : (
            <AttendanceTable
              rows={completedRows}
              nowMs={nowMs}
              mode="completed"
            />
          )}

          {canViewGym && totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {meta?.pagination?.total ?? 0}{" "}
                rows
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function AttendanceTable({
  rows,
  nowMs,
  mode,
}: {
  rows: AttendanceRow[];
  nowMs: number;
  mode: "active" | "completed";
}) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Gender</th>
              <th className="px-4 py-3 font-medium">Slot</th>
              <th className="px-4 py-3 font-medium">Check in</th>
              {mode === "completed" ? (
                <th className="px-4 py-3 font-medium">Check out</th>
              ) : null}
              <th className="px-4 py-3 font-medium">
                {mode === "active" ? "Time now" : "Time spent"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const live = formatElapsed(
                r.checked_in_at,
                nowMs,
                r.checked_out_at,
              );
              const spentLabel = r.checked_out_at
                ? formatDurationLabel(r.checked_in_at, r.checked_out_at)
                : null;

              return (
                <tr
                  key={r.id}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        {r.avatar_url ? (
                          <AvatarImage src={r.avatar_url} alt={r.full_name} />
                        ) : null}
                        <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                          {getNameInitials(r.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{r.full_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.email || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize">
                      {r.role === "admin" ? "gym owner" : r.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 capitalize">{r.gender || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className="border-primary/30 text-primary capitalize"
                    >
                      {formatSlotLabel(r.slot)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatVisitWhen(r.checked_in_at)}
                  </td>
                  {mode === "completed" ? (
                    <td className="px-4 py-3 tabular-nums">
                      {r.checked_out_at
                        ? formatVisitWhen(r.checked_out_at)
                        : "—"}
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    {mode === "active" ? (
                      <div className="space-y-0.5">
                        <p className="font-mono text-base font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {live}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          In gym
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="font-semibold tabular-nums">
                          {spentLabel}
                        </p>
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                          {live}
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
