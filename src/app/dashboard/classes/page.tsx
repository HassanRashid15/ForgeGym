"use client";

import { ComingSoon } from "@/components/ComingSoon";
import { Dumbbell } from "lucide-react";

export default function ClassesPage() {
  return (
    <ComingSoon
      title="Classes"
      description="Class browsing and booking is almost ready. Join now, connect with your gym, and you’ll be first in line when schedules go live."
      icon={Dumbbell}
      features={[
        "Browse gym class schedules",
        "Book and cancel sessions",
        "See capacity and waitlists",
      ]}
    />
  );
}
