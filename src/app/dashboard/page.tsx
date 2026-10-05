import { checkWelcomeModalSSR } from "./ssr-dashboard-check";
import { AdminDashboardClient } from "./AdminDashboardClient";

/** Uses auth cookies for welcome-modal SSR — cannot be statically prerendered. */
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Check welcome modal status on server for immediate display
  const welcomeData = await checkWelcomeModalSSR();

  return <AdminDashboardClient initialWelcomeData={welcomeData} />;
}
