import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Email Verification",
  description: "Confirm your Forge Gym email address.",
  path: "/verify",
  noIndex: true,
});

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
