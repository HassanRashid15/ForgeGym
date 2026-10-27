"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Clock, LogOut, MapPin, Timer } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkOutAttendance,
  listAttendance,
  type AttendanceCheckin,
} from "@/api/attendance";
import { ApiError } from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";

function formatElapsed(startIso: string, nowMs: number) {
  const start = new Date(startIso).getTime();
  const totalSec = Math.max(0, Math.floor((nowMs - start) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function endKey(checkinId: string) {
  return `attendance-planned-end:${checkinId}`;
}

function readPlannedEnd(checkinId: string): string | null {
  try {
    return localStorage.getItem(endKey(checkinId));
  } catch {
    return null;
  }
}

function writePlannedEnd(checkinId: string, iso: string | null) {
  try {
    if (!iso) localStorage.removeItem(endKey(checkinId));
    else localStorage.setItem(endKey(checkinId), iso);
  } catch {
    /* ignore */
  }
}

/** Local datetime-local value from Date */
function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  /** Compact banner (progress) vs fuller card (attendance) */
  variant?: "banner" | "card";
  className?: string;
};

/**
 * Live session timer while checked in — shown on Attendance + Progress.
 * Optional planned end time (client-stored) with countdown.
 */
export function ActiveSessionTimer({ variant = "banner", className }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState<AttendanceCheckin | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showEndTime, setShowEndTime] = useState(false);
  const [plannedEnd, setPlannedEnd] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Ignore stale list responses that still show a row we just closed. */
  const closedIdsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user?.id) {
      setOpen(null);
      return;
    }
    try {
      const data = await listAttendance({ scope: "me", page: 1, pageSize: 25 });
      const mine =
        (data.checkins || []).find(
          (r) =>
            r.user_id === user.id &&
            (r.open === true || r.checked_out_at == null) &&
            !closedIdsRef.current.has(String(r.id)),
        ) || null;
      const active = mine && !mine.checked_out_at ? mine : null;
      setOpen(active);
      if (active?.id) {
        const saved = readPlannedEnd(String(active.id));
        if (saved) {
          setPlannedEnd(saved);
          setShowEndTime(true);
        }
      } else {
        setPlannedEnd(null);
        setShowEndTime(false);
      }
    } catch {
      /* ignore — progress still works without timer */
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 8_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open?.id]);

  const whereLabel =
    open?.source === "in_gym"
      ? "In gym"
      : open?.source === "not_in_gym"
        ? "Not in gym"
        : null;

  const remainingLabel = useMemo(() => {
    if (!plannedEnd) return null;
    const end = new Date(plannedEnd).getTime();
    if (Number.isNaN(end)) return null;
    const left = Math.max(0, Math.floor((end - nowMs) / 1000));
    if (left === 0) return "Ended";
    const h = Math.floor(left / 3600);
    const m = Math.floor((left % 3600) / 60);
    const s = left % 60;
    if (h > 0) return `${h}h ${m}m left`;
    if (m > 0) return `${m}m ${s}s left`;
    return `${s}s left`;
  }, [plannedEnd, nowMs]);

  const onPlannedEndChange = (localValue: string) => {
    if (!open?.id) return;
    if (!localValue) {
      setPlannedEnd(null);
      writePlannedEnd(String(open.id), null);
      return;
    }
    const iso = new Date(localValue).toISOString();
    setPlannedEnd(iso);
    writePlannedEnd(String(open.id), iso);
  };

  const checkOut = async () => {
    if (!open?.id) return;
    const closingId = String(open.id);
    setBusy(true);
    try {
      await checkOutAttendance({ id: closingId });
      closedIdsRef.current.add(closingId);
      writePlannedEnd(closingId, null);
      setOpen(null);
      setPlannedEnd(null);
      setShowEndTime(false);
      toast.success("Checked out");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Check-out failed");
    } finally {
      setBusy(false);
    }
  };

  if (!open?.checked_in_at) return null;

  const elapsed = formatElapsed(String(open.checked_in_at), nowMs);
  const shell =
    variant === "card"
      ? "rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-sm sm:p-5"
      : "rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 shadow-md backdrop-blur-md supports-[backdrop-filter]:bg-primary/15";

  return (
    <div
      className={`sticky top-0 z-30 ${shell} ${className || ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Timer className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Session timer
            </p>
            <p className="font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground sm:text-3xl">
              {elapsed}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Started {formatClock(String(open.checked_in_at))}
              {showEndTime && plannedEnd
                ? ` · Ends ${formatClock(plannedEnd)}`
                : ""}
              {remainingLabel ? ` · ${remainingLabel}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {whereLabel ? (
            <Badge
              variant="outline"
              className={
                open.source === "in_gym"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }
            >
              <MapPin className="mr-1 h-3 w-3" />
              {whereLabel}
            </Badge>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={showEndTime ? "default" : "outline"}
            className="gap-1.5"
            onClick={() => {
              setShowEndTime((v) => {
                const next = !v;
                if (next && !plannedEnd && open.checked_in_at) {
                  const d = new Date();
                  d.setHours(d.getHours() + 1);
                  const iso = d.toISOString();
                  setPlannedEnd(iso);
                  writePlannedEnd(String(open.id), iso);
                }
                return next;
              });
            }}
          >
            <Clock className="h-3.5 w-3.5" />
            End time
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={busy}
            onClick={() => void checkOut()}
          >
            <LogOut className="h-3.5 w-3.5" />
            Check out
          </Button>
          {variant === "banner" ? (
            <Button asChild size="sm" variant="ghost">
              <Link href="/dashboard/attendance">Attendance</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {showEndTime ? (
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border/50 pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="session-end-time" className="text-xs">
              Planned end time
            </Label>
            <Input
              id="session-end-time"
              type="datetime-local"
              className="w-auto"
              value={
                plannedEnd ? toLocalInputValue(new Date(plannedEnd)) : ""
              }
              onChange={(e) => onPlannedEndChange(e.target.value)}
            />
          </div>
          {remainingLabel ? (
            <p className="pb-2 text-sm font-medium text-primary">
              {remainingLabel}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
