import { ComingSoon } from "@/components/ComingSoon";
import { Calendar } from "lucide-react";

export default function SchedulePage() {
  return (
    <ComingSoon
      title="Schedule"
      description="Weekly timetable and upcoming sessions. This ships in the next phase."
      icon={Calendar}
      features={[
        "Week view of class times",
        "Reminders for upcoming sessions",
        "Gym-wide schedule sync",
      ]}
    />
  );
}
