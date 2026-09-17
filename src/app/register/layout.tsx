import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Register",
  description: "Create a Forge Gym account as a member or gym owner.",
  path: "/register",
  noIndex: true,
});

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
