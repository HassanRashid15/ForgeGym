import { redirect } from "next/navigation";
import { createSupabaseCookieClient } from "@/lib/supabase/server";
import ProfileClientLayout from "./ProfileClientLayout";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Your Profile",
  description: "Manage your Forge Gym profile, preferences, and account settings.",
  path: "/profile",
  noIndex: true,
});

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseCookieClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/profile");
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
    <ProfileClientLayout serverAuthenticated isFrozen={isFrozen} frozenUntil={frozenUntil}>
      {children}
    </ProfileClientLayout>
  );
}
