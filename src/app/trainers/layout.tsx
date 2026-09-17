import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Trainers",
  description:
    "Meet personal trainers at Forge partner gyms — specialties, experience, and coaching profiles.",
  path: "/trainers",
});

export default function TrainersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
