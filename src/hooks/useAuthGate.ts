"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type AuthGateOptions = {
  /** Server layout already confirmed a verified cookie session. */
  serverAuthenticated?: boolean;
};

/**
 * Shared client-side auth gate for dashboard/profile shells.
 * Blocks unverified users (user or admin) from staying on protected routes.
 */
export function useAuthGate(redirectPath: string, options: AuthGateOptions = {}) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(!!options.serverAuthenticated);

  useEffect(() => {
    if (isAuthLoading) return;

    let cancelled = false;

    const enforce = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;

        const authUser = data?.user;
        if (authUser && !authUser.email_confirmed_at) {
          await supabase.auth.signOut({ scope: "local" });
          const encodedEmail = encodeURIComponent(authUser.email || "");
          router.replace(`/verification?email=${encodedEmail}`);
          return;
        }

        if (options.serverAuthenticated) {
          setAuthChecked(true);
          return;
        }

        if (user || authUser) {
          setAuthChecked(true);
          return;
        }

        router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      } catch {
        if (!cancelled && !options.serverAuthenticated && !user) {
          router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
        } else if (!cancelled) {
          setAuthChecked(true);
        }
      }
    };

    void enforce();

    return () => {
      cancelled = true;
    };
  }, [user, isAuthLoading, router, redirectPath, options.serverAuthenticated]);

  return {
    user,
    isAuthLoading,
    authChecked,
    ready: options.serverAuthenticated
      ? !isAuthLoading || authChecked
      : !isAuthLoading && authChecked,
  };
}
