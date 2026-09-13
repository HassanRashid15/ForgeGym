"use client";

import { ComingSoon } from "@/components/ComingSoon";
import { Calendar } from "lucide-react";

export default function SchedulePage() {
  return (
    <ComingSoon
      title="Schedule"
      description="Your personal class schedule is coming soon. Until then, log workouts on Progress and stay connected with your gym."
      icon={Calendar}
      features={[
        "Weekly class calendar",
        "Reminders before sessions",
        "Sync with booked classes",
      ]}
      backHref="/dashboard/progress"
      backLabel="Go to Progress"
    />
  );
}
