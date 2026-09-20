import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "About the Platform",
  description:
    "Forge Gym connects partner gyms, trainers, and members — honest tools built for the floor, not just the brochure.",
  path: "/about",
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
