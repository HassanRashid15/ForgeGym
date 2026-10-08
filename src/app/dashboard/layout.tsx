import { redirect } from "next/navigation";
import { createSupabaseCookieClient } from "@/lib/supabase/server";
import DashboardClientLayout from "./DashboardClientLayout";
import { buildPageMetadata } from "@/lib/seo";

/** Auth cookie session — must render per-request, not as a static page. */
export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Dashboard",
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
    .select("is_verified, is_frozen, frozen_until")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.is_verified !== true) {
    const q = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
    redirect(`/verification${q}`);
  }

  // Check if account is frozen
  const isFrozen = profile?.is_frozen === true;
  const frozenUntil = profile?.frozen_until;

  return (
    <DashboardClientLayout serverAuthenticated isFrozen={isFrozen} frozenUntil={frozenUntil}>
      {children}
    </DashboardClientLayout>
  );
}
