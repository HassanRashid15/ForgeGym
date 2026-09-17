import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Equipment",
  description:
    "Explore gym equipment and training tools featured across the Forge partner network.",
  path: "/equipment",
});

export default function EquipmentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
