"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Loader2, CheckCircle2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  checkInAttendance,
  checkOutAttendance,
  listAttendance,
} from "@/api/attendance";
import { ApiError } from "@/api/client";

type CheckinState = {
  openId: string | null;
};

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
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    );
  });
}

export function CheckInButton({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<CheckinState>({ openId: null });

  async function refresh() {
    try {
      const data = await listAttendance({ scope: "me" });
      const list = data.checkins || [];
      const open = list.find((c) => c.open || !c.checked_out_at);
      setState({ openId: open?.id || null });
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function checkIn() {
    setLoading(true);
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
        toast.success("Checked in!");
      }
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Check-in failed — open Attendance for code/GPS",
      );
    } finally {
      setLoading(false);
    }
  }

  async function checkOut() {
    setLoading(true);
    try {
      await checkOutAttendance(state.openId ? { id: state.openId } : {});
      toast.success("Checked out");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Check-out failed");
    } finally {
      setLoading(false);
    }
  }

  if (state.openId) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          disabled
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          In gym
        </Button>
        <Button
          onClick={() => void checkOut()}
          disabled={loading}
          size={compact ? "sm" : "default"}
          variant="secondary"
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Check out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => void checkIn()}
        disabled={loading}
        size={compact ? "sm" : "default"}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MapPin className="h-4 w-4" />
        )}
        Check in
      </Button>
      <Button asChild variant="outline" size={compact ? "sm" : "default"}>
        <Link href="/dashboard/attendance">Attendance</Link>
      </Button>
    </div>
  );
}
