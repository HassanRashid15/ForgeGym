import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Verify Your Email",
  description: "Confirm your email address to activate your Forge Gym account.",
  path: "/verification",
  noIndex: true,
});

export default function VerificationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
