import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Membership Plans",
  description:
    "Explore Forge Gym membership options. Join a partner gym with clear approval and billing paths.",
  path: "/membership",
});

export default function MembershipLayout({ children }: { children: React.ReactNode }) {
  return children;
}
