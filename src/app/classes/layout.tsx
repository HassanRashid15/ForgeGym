import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Group Fitness Classes",
  description:
    "Browse HIIT, strength, and group training classes at Forge partner gyms. Booking expands in the next product phase.",
  path: "/classes",
});

export default function ClassesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
