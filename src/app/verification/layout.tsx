import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Verify email",
  description: "Verify your Forge Gym email address to continue.",
  path: "/verification",
  noIndex: true,
});

export default function VerificationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
