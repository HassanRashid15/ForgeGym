import { createSupabaseCookieClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { ProgressMoodSsrPrompt } from "@/components/progress/ProgressMoodSsrPrompt";
import { ProgressPageClient } from "./ProgressPageClient";

export const dynamic = "force-dynamic";

/**
 * Progress — SSR asks mood immediately for members, then client continues
 * with energy + recommended exercises.
 */
export default async function ProgressPage() {
  let askMoodFirst = false;

  try {
    const service = createSupabaseServiceClient();
    const supabase = await createSupabaseCookieClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && service) {
      const [{ data: roles }, { data: profile }] = await Promise.all([
        service.from("user_roles").select("role").eq("user_id", user.id),
        service
          .from("profiles")
          .select("is_super_admin, gym_owner_id")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      const roleNames = (roles || []).map((r) => (r as { role: string }).role);
      const isSuperAdmin =
        (profile as { is_super_admin?: boolean } | null)?.is_super_admin === true;
      const isAdmin = roleNames.includes("admin");
      const isTrainer = roleNames.includes("trainer");
      // Members / platform members get the mood gate on first paint
      askMoodFirst = !isSuperAdmin && !isAdmin && !isTrainer;
    }
  } catch {
    askMoodFirst = false;
  }

  return (
    <>
      {askMoodFirst ? <ProgressMoodSsrPrompt /> : null}
      <ProgressPageClient askMoodFirst={askMoodFirst} />
    </>
  );
}
