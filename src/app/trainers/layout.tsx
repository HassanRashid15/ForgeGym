import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Personal Trainers",
  description:
    "Meet certified personal trainers at Forge partner gyms — specialties, experience, and coaching profiles.",
  path: "/trainers",
});

export default function TrainersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
