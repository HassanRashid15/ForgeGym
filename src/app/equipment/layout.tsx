import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Gym Equipment Guide",
  description:
    "Explore cardio, strength, and functional equipment featured across the Forge partner gym network.",
  path: "/equipment",
});

export default function EquipmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
