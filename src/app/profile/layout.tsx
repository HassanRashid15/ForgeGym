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

  return (
    <ProfileClientLayout serverAuthenticated>{children}</ProfileClientLayout>
  );
}
