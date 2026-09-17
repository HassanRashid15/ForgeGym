import { ComingSoon } from "@/components/ComingSoon";
import { Dumbbell } from "lucide-react";

export default function ClassesPage() {
  return (
    <ComingSoon
      title="Classes"
      description="Create, book, and manage gym classes. This ships in the next phase."
      icon={Dumbbell}
      features={[
        "Class catalog for your gym",
        "Session booking for members",
        "Capacity and waitlists",
      ]}
    />
  );
}
