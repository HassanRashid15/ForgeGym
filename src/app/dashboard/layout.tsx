import { redirect } from "next/navigation";
import { createSupabaseCookieClient } from "@/lib/supabase/server";
import DashboardClientLayout from "./DashboardClientLayout";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Member Dashboard",
  description: "Manage membership, attendance, progress, and gym operations on Forge Gym.",
  path: "/dashboard",
  noIndex: true,
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseCookieClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  if (!user.email_confirmed_at) {
    const q = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
    redirect(`/verification${q}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.is_verified !== true) {
    const q = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
    redirect(`/verification${q}`);
  }

  return (
    <DashboardClientLayout serverAuthenticated>
      {children}
    </DashboardClientLayout>
  );
}
