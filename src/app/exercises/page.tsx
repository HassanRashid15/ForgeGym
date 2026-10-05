import { Suspense } from "react";
import ExercisesPageClient from "@/components/exercises/ExercisesPageClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Exercise Library",
  description: "Browse our comprehensive exercise library with workout demos, instructions, and muscle group information.",
  path: "/exercises",
});

export default async function ExercisesPage() {
  return (
    <Suspense fallback={<div>Loading exercises...</div>}>
      <ExercisesPageClient />
    </Suspense>
  );
}
