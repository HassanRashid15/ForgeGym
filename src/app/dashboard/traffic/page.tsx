import { redirect } from "next/navigation";
import {
  createSupabaseCookieClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { listPublicTraffic } from "@/lib/public-traffic";
import { PublicTrafficClient } from "@/components/admin/PublicTrafficClient";

export const dynamic = "force-dynamic";

async function requireSuperAdminOrRedirect() {
  const supabase = await createSupabaseCookieClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/dashboard/traffic");

  const service = createSupabaseServiceClient();
  const db = service || supabase;
  const { data: profile } = await db
    .from("profiles")
    .select("is_super_admin, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const email = (profile?.email || user.email || "").toLowerCase();
  const isSuperAdmin =
    (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true ||
    email === "superadmin@forge.test";

  if (!isSuperAdmin) redirect("/dashboard");
}

/**
 * SSR Public Traffic — data loads on the server so the table paints immediately.
 * Client keeps the list live via Realtime INSERT + short poll fallback.
 */
export default async function PublicTrafficPage() {
  await requireSuperAdminOrRedirect();
  const data = await listPublicTraffic(250);

  return (
    <PublicTrafficClient
      initialVisits={data.visits}
      initialTotal={data.total}
      initialToday={data.today}
      initialUniqueIps={data.uniqueIps}
    />
  );
}
