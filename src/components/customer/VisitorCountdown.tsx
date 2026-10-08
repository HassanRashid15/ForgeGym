"use client";

import { useState, useEffect } from "react";
import { Clock, Target, Percent } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[2.25rem] text-center">
      <p className="font-display text-lg tabular-nums leading-none text-foreground sm:text-xl">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function VisitorCountdown() {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState<CountdownParts>({
    days: 1,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserJoinDate = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("join_date, created_at, trial_ends_at")
          .eq("user_id", user.id)
          .single();

        console.log("Profile data:", profile);

        // Use trial_ends_at if available, otherwise calculate from join_date/created_at
        let targetDate: Date;
        if (profile?.trial_ends_at) {
          targetDate = new Date(profile.trial_ends_at);
        } else {
          const joinDate = profile?.join_date || profile?.created_at || new Date().toISOString();
          const startDate = new Date(joinDate);
          console.log("Join date:", joinDate, "Start date:", startDate);

          // Set target to 1 day after join date
          targetDate = new Date(startDate);
          targetDate.setDate(targetDate.getDate() + 1);
        }

        setPeriodEnd(targetDate.toISOString());

        console.log("Target date:", targetDate, "Period end:", periodEnd);

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch user join date:", error);
        setLoading(false);
      }
    };

    fetchUserJoinDate();
  }, [user?.id]);

  useEffect(() => {
    if (!periodEnd || loading) return;

    const targetDate = new Date(periodEnd);

    const interval = setInterval(() => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        // Offer expired
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [periodEnd, loading]);

  if (loading) {
    return (
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Special Offer
          </h2>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 sm:gap-2 sm:px-3"
          title={periodEnd ? `Offer ends ${new Date(periodEnd).toLocaleString()}` : "Limited time offer"}
        >
          <Clock className="hidden h-3.5 w-3.5 shrink-0 sm:block text-primary" />
          <div className="flex items-center gap-1 sm:gap-1.5">
            <CountdownUnit value={timeLeft.days} label="d" />
            <span className="pb-3 text-muted-foreground/50">:</span>
            <CountdownUnit value={timeLeft.hours} label="h" />
            <span className="pb-3 text-muted-foreground/50">:</span>
            <CountdownUnit value={timeLeft.minutes} label="m" />
            <span className="pb-3 text-muted-foreground/50">:</span>
            <CountdownUnit value={timeLeft.seconds} label="s" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-3xl text-foreground">20% OFF</p>
          <p className="mt-1 text-sm text-muted-foreground">
            First month membership
            {" · "}
            {timeLeft.days > 0 || timeLeft.hours > 0 || timeLeft.minutes > 0
              ? `${timeLeft.days > 0 ? `${timeLeft.days} day${timeLeft.days === 1 ? "" : "s"}` : ""}${timeLeft.hours > 0 ? ` ${timeLeft.hours} hour${timeLeft.hours === 1 ? "" : "s"}` : ""}${timeLeft.minutes > 0 ? ` ${timeLeft.minutes} minute${timeLeft.minutes === 1 ? "" : "s"}` : ""} remaining`
              : "Offer expired"}
          </p>
          {periodEnd && (
            <p className="text-xs text-muted-foreground">
              Offer ends {new Date(periodEnd).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
            <Percent className="h-3.5 w-3.5" />
            New members only
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-border/60 pt-4">
        <p className="mb-3 text-xs text-muted-foreground">
          Join a gym today and unlock exclusive member benefits including progress tracking, class bookings, and personal trainer access.
        </p>
        <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
          <Target className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Your next step:</span> Browse gyms and request membership to get started.
          </p>
        </div>
      </div>
    </section>
  );
}
