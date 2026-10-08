"use client";

import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { FrozenAccountModal } from "@/components/auth/FrozenAccountModal";

/**
 * Client shell used after the server layout has already verified a cookie session.
 */
export default function DashboardClientLayout({
  children,
  serverAuthenticated,
  isFrozen = false,
  frozenUntil,
}: {
  children: React.ReactNode;
  serverAuthenticated?: boolean;
  isFrozen?: boolean;
  frozenUntil?: string | null;
}) {
  return (
    <AuthenticatedShell
      redirectPath="/dashboard"
      serverAuthenticated={serverAuthenticated}
    >
      {isFrozen && <FrozenAccountModal frozenUntil={frozenUntil} canClose={false} lockNavigation={true} />}
      {children}
    </AuthenticatedShell>
  );
}
