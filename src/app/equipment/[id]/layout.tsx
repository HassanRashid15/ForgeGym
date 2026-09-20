import { buildPageMetadata } from "@/lib/seo";
import { getEquipmentById } from "@/data/equipment";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const equipment = getEquipmentById(id);

  if (!equipment) {
    return buildPageMetadata({
      title: "Equipment Not Found",
      description: "This equipment guide is not available on Forge Gym.",
      path: `/equipment/${id}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${equipment.name} — ${equipment.category} Equipment`,
    description: equipment.shortDescription.slice(0, 160),
    path: `/equipment/${id}`,
    image: equipment.image,
  });
}

export default function EquipmentDetailLayout({ children }: LayoutProps) {
  return children;
}
