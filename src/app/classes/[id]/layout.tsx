import { buildPageMetadata } from "@/lib/seo";
import { getClassById } from "@/data/classes";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gymClass = getClassById(id);

  if (!gymClass) {
    return buildPageMetadata({
      title: "Class Not Found",
      description: "This class is not available on Forge Gym.",
      path: `/classes/${id}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${gymClass.name} — ${gymClass.category} Class`,
    description: gymClass.description.slice(0, 160),
    path: `/classes/${id}`,
    image: gymClass.image,
  });
}

export default function ClassDetailLayout({ children }: LayoutProps) {
  return children;
}
