"use client";

import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";

/**
 * Client shell used after the server layout has already verified a cookie session.
 */
export default function DashboardClientLayout({
  children,
  serverAuthenticated,
}: {
  children: React.ReactNode;
  serverAuthenticated?: boolean;
}) {
  return (
    <AuthenticatedShell
      redirectPath="/dashboard"
      serverAuthenticated={serverAuthenticated}
    >
      {children}
    </AuthenticatedShell>
  );
}
