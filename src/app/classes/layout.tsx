import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Classes",
  description:
    "Group classes and training sessions at Forge partner gyms. Class booking expands in the next product phase.",
  path: "/classes",
});

export default function ClassesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
