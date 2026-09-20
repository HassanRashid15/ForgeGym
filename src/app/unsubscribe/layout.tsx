import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Unsubscribe from Emails",
  description: "Stop receiving Forge Gym newsletter and promotion emails.",
  path: "/unsubscribe",
  noIndex: true,
});

export default function UnsubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
