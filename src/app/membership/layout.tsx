import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Membership",
  description:
    "Explore Forge membership options. Join a partner gym and start training with clear approval and billing paths.",
  path: "/membership",
});

export default function MembershipLayout({ children }: { children: React.ReactNode }) {
  return children;
}
