"use client";

import { AuthenticatedShell } from "@/components/layout/AuthenticatedShell";

export default function ProfileClientLayout({
  children,
  serverAuthenticated,
}: {
  children: React.ReactNode;
  serverAuthenticated?: boolean;
}) {
  return (
    <AuthenticatedShell
      redirectPath="/profile"
      serverAuthenticated={serverAuthenticated}
    >
      {children}
    </AuthenticatedShell>
  );
}
