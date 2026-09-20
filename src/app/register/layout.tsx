import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Create Your Account",
  description: "Register on Forge Gym as a member, trainer, or gym owner and start training with partner gyms.",
  path: "/register",
  noIndex: true,
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
