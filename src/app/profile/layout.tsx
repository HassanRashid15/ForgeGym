import { redirect } from "next/navigation";
import { createSupabaseCookieClient } from "@/lib/supabase/server";
import ProfileClientLayout from "./ProfileClientLayout";

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
    .select("is_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profile?.is_verified !== true) {
    const q = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
    redirect(`/verification${q}`);
  }

  return (
    <ProfileClientLayout serverAuthenticated>{children}</ProfileClientLayout>
  );
}
