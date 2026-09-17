"use client";

import { useEffect, useState } from "react";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CheckInButton({ compact = false }: { compact?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/attendance?scope=me", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const hit = ((data.checkins as { checked_in_at: string }[]) || []).some(
          (c) => new Date(c.checked_in_at) >= today,
        );
        if (hit) setDone(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function checkIn() {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "manual" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Check-in failed");
        return;
      }
      setDone(true);
      toast.success(data.alreadyCheckedIn ? "Already checked in today" : "Checked in!");
    } catch {
      toast.error("Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Button variant="outline" size={compact ? "sm" : "default"} disabled className="gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        Checked in today
      </Button>
    );
  }

  return (
    <Button
      onClick={() => void checkIn()}
      disabled={loading}
      size={compact ? "sm" : "default"}
      className="gap-2"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
      Check in
    </Button>
  );
}
