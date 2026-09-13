"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type AuthGateOptions = {
  /** Server layout already confirmed a cookie session. */
  serverAuthenticated?: boolean;
};

/**
 * Shared client-side auth gate for dashboard/profile shells.
 * When `serverAuthenticated` is true, we still hydrate AuthContext but skip
 * the hard redirect race (proxy + server layout already enforced access).
 */
export function useAuthGate(redirectPath: string, options: AuthGateOptions = {}) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(!!options.serverAuthenticated);

  useEffect(() => {
    if (options.serverAuthenticated) {
      if (!isAuthLoading && user) {
        setAuthChecked(true);
      }
      // Server already allowed access — don't bounce to login while client hydrates
      if (!isAuthLoading && !user) {
        setAuthChecked(true);
      }
      return;
    }

    if (isAuthLoading) return;

    if (user) {
      setAuthChecked(true);
      return;
    }

    let cancelled = false;
    const failSafe = setTimeout(() => {
      if (!cancelled) {
        router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      }
    }, 5000);

    const checkUnverified = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        if (data?.user && !data.user.email_confirmed_at) {
          const encodedEmail = encodeURIComponent(data.user.email || "");
          router.replace(`/verification?email=${encodedEmail}`);
          return;
        }
      } catch {
        // ignore
      }
      if (!cancelled) {
        router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      }
    };

    void checkUnverified();
    return () => {
      cancelled = true;
      clearTimeout(failSafe);
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
