import { checkWelcomeModalSSR } from "./ssr-dashboard-check";
import { AdminDashboardClient } from "./AdminDashboardClient";

export default async function DashboardPage() {
  // Check welcome modal status on server for immediate display
  const welcomeData = await checkWelcomeModalSSR();

  return <AdminDashboardClient initialWelcomeData={welcomeData} />;
}
