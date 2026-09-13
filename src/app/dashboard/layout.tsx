import { redirect } from "next/navigation";
import { createSupabaseCookieClient } from "@/lib/supabase/server";
import DashboardClientLayout from "./DashboardClientLayout";

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

  return (
    <DashboardClientLayout serverAuthenticated>
      {children}
    </DashboardClientLayout>
  );
}
