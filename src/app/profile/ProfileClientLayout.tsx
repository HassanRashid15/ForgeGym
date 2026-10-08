"use client";

import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";
import { FrozenAccountModal } from "@/components/auth/FrozenAccountModal";

export default function ProfileClientLayout({
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
      redirectPath="/profile"
      serverAuthenticated={serverAuthenticated}
    >
      {isFrozen && <FrozenAccountModal frozenUntil={frozenUntil} canClose={false} lockNavigation={true} />}
      {children}
    </AuthenticatedShell>
  );
}
