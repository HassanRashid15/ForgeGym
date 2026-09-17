import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "About",
  description:
    "Forge is a soft-launch fitness platform for partner gyms — honest numbers, real coaches, and tools built for the floor.",
  path: "/about",
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
