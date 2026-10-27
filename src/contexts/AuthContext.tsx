"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { User, AuthContextType, FitnessProfileData, RegisterMediaFiles } from "@/types/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  loginWithPassword,
  registerAccount,
  logoutAccount,
  checkAccountExists as apiCheckAccountExists,
  checkEmailVerified as apiCheckEmailVerified,
  resendVerificationEmail as apiResendVerificationEmail,
  updateEmail as apiUpdateEmail,
  fetchCurrentUser,
} from "@/api/auth";
import { updateMyProfile } from "@/api/profiles";
import { pickAllowedProfileFields } from "@/lib/profiles/allowlist";
import { ApiError } from "@/api/client";
import { resolveRole } from "@/lib/auth/roles";
import {
  MePayload,
  MeCacheEntry,
  readMeCache,
  writeMeCache,
  withTimeout,
} from "@/lib/auth/me-cache";
import { trackEvent, trackException } from "@/lib/monitoring";
import { AuthBusyOverlay } from "@/components/auth/AuthBusyOverlay";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [farewellName, setFarewellName] = useState<string | null>(null);
  const userRef = useRef<User | null>(null);
  const syncGenRef = useRef(0);
  const syncedUserIdRef = useRef<string | null>(null);
  const meCacheRef = useRef<MeCacheEntry | null>(null);
  const meInflightRef = useRef<Promise<MePayload | null> | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_DEBOUNCE_MS = 1000;

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const getMeOnce = async (userId: string, force = false): Promise<MePayload | null> => {
    if (!force) {
      const cached = readMeCache(meCacheRef.current, userId);
      if (cached) return cached;
      if (meInflightRef.current) return meInflightRef.current;

      // Debounce: if we fetched recently, wait before allowing another request
      const timeSinceLastFetch = Date.now() - lastFetchTimeRef.current;
      if (timeSinceLastFetch < FETCH_DEBOUNCE_MS) {
        await new Promise((resolve) => setTimeout(resolve, FETCH_DEBOUNCE_MS - timeSinceLastFetch));
        // Check cache again after debounce
        const cachedAfterDebounce = readMeCache(meCacheRef.current, userId);
        if (cachedAfterDebounce) return cachedAfterDebounce;
      }
    }

    lastFetchTimeRef.current = Date.now();

    const request = withTimeout(
      fetchCurrentUser()
        .then((m) => {
          const payload = m as MePayload;
          meCacheRef.current = writeMeCache(userId, payload);
          return payload;
        })
        .catch(() => null),
      6000,
      null,
    ).finally(() => {
      meInflightRef.current = null;
    });

    meInflightRef.current = request;
    return request;
  };

  const syncUserProfile = async (
    sessionUser: { id?: string; email?: string | null; user_metadata?: Record<string, unknown> },
    options?: { force?: boolean },
  ): Promise<string | null> => {
    if (!sessionUser?.id) return null;

    const force = options?.force === true;
    const userId = sessionUser.id;
    const userEmail = (sessionUser.email || "").toLowerCase();

    if (!force && syncedUserIdRef.current === userId && userRef.current?.id === userId) {
      return userRef.current?.name || null;
    }

    const gen = ++syncGenRef.current;
    const fallbackName =
      (sessionUser.user_metadata?.full_name as string | undefined) ||
      userEmail.split("@")[0] ||
      "User";

    // Do not set an optimistic user before /me — login would redirect to /dashboard
    // and bounce (refresh loop) when the account is still pending approval.

    try {
      const me = await getMeOnce(userId, force);
      if (gen !== syncGenRef.current) return fallbackName;

      if (!me) {
        // Session without a usable /me — clear so auth pages don't redirect-loop
        meCacheRef.current = null;
        syncedUserIdRef.current = null;
        if (!userRef.current || userRef.current.id !== userId) {
          setUser(null);
        }
        return null;
      }

      let appRole = resolveRole(
        me.role,
        sessionUser.user_metadata?.requested_role as string | undefined,
      );

      const isSuperAdmin = me.isSuperAdmin === true;
      const apiApproved = me.admin_approved === true;

      if (!isSuperAdmin && me.is_verified !== true) {
        meCacheRef.current = null;
        syncedUserIdRef.current = null;
        await supabase.auth.signOut();
        setUser(null);
        return null;
      }

      // Gym owners, gym customers, and platform members all need approval before dashboard
      if (!isSuperAdmin && !apiApproved) {
        meCacheRef.current = null;
        syncedUserIdRef.current = null;
        await supabase.auth.signOut();
        setUser(null);
        return null;
      }

      syncedUserIdRef.current = userId;
      const resolvedName = me.name || fallbackName;
      const nextUser = {
        id: userId,
        email: me.email || userEmail,
        name: resolvedName,
        role: appRole,
        isSuperAdmin,
        isVisitor: me.isVisitor === true,
        avatar: me.avatar || (sessionUser.user_metadata?.avatar_url as string | undefined) || undefined,
        gymName: me.gymName || null,
        gymOwnerId: me.gymOwnerId || null,
        gymCity: me.gymCity || null,
        gymType: me.gymType || null,
        gymMainImageUrl: me.gymMainImageUrl || null,
        dashboardHeroUrl: me.dashboardHeroUrl || null,
        membershipStatus: me.membershipStatus || null,
        membershipType: me.membershipType || null,
        featureClassesEnabled: me.featureClassesEnabled === true,
        featureScheduleEnabled: me.featureScheduleEnabled === true,
        featureMembershipEnabled: me.featureMembershipEnabled === true,
        trial: me.trial || null,
        platformFeeStatus: me.platformFeeStatus || null,
        platformMonthlyFee: me.platformMonthlyFee || null,
      };
      const prev = userRef.current;
      const unchanged =
        prev &&
        prev.id === nextUser.id &&
        prev.email === nextUser.email &&
        prev.name === nextUser.name &&
        prev.role === nextUser.role &&
        prev.isSuperAdmin === nextUser.isSuperAdmin &&
        prev.isVisitor === nextUser.isVisitor &&
        prev.avatar === nextUser.avatar &&
        prev.gymName === nextUser.gymName &&
        prev.gymOwnerId === nextUser.gymOwnerId &&
        prev.gymCity === nextUser.gymCity &&
        prev.gymType === nextUser.gymType &&
        prev.gymMainImageUrl === nextUser.gymMainImageUrl &&
        prev.dashboardHeroUrl === nextUser.dashboardHeroUrl &&
        prev.membershipStatus === nextUser.membershipStatus &&
        prev.membershipType === nextUser.membershipType &&
        prev.featureClassesEnabled === nextUser.featureClassesEnabled &&
        prev.featureScheduleEnabled === nextUser.featureScheduleEnabled &&
        prev.featureMembershipEnabled === nextUser.featureMembershipEnabled &&
        prev.platformFeeStatus === nextUser.platformFeeStatus &&
        prev.platformMonthlyFee === nextUser.platformMonthlyFee &&
        prev.trial?.status === nextUser.trial?.status &&
        prev.trial?.daysLeft === nextUser.trial?.daysLeft &&
        prev.trial?.endsAt === nextUser.trial?.endsAt;
      if (!unchanged) setUser(nextUser);
      return resolvedName;
    } catch (error) {
      trackException(error, { action: "syncUserProfile" });
      if (!userRef.current) {
        setUser({
          id: userId,
          email: userEmail,
          name: fallbackName,
          role: "customer",
          isSuperAdmin: false,
          isVisitor: false,
          avatar: (sessionUser.user_metadata?.avatar_url as string | undefined) || undefined,
        });
      }
      return fallbackName;
    }
  };

  useEffect(() => {
    setMounted(true);
    let alive = true;
    let bootDone = false;

    const loadingWatchdog = setTimeout(() => {
      if (alive) setIsLoading(false);
    }, 10000);

    const boot = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          8000,
          { data: { session: null } } as Awaited<ReturnType<typeof supabase.auth.getSession>>,
        );

        if (!alive) return;

        if (!session?.user) {
          setUser(null);
          syncedUserIdRef.current = null;
          meCacheRef.current = null;
          setIsLoading(false);
          bootDone = true;
          return;
        }

        if (!session.user.email_confirmed_at) {
          setUser(null);
          syncedUserIdRef.current = null;
          meCacheRef.current = null;
          await supabase.auth.signOut({ scope: "local" });
          setIsLoading(false);
          bootDone = true;
          return;
        }

        await syncUserProfile(session.user);
      } catch (err) {
        trackException(err, { action: "auth_boot" });
        if (alive) setUser(null);
      } finally {
        bootDone = true;
        if (alive) setIsLoading(false);
      }
    };

    void boot();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(() => {
        if (!alive) return;

        if (event === "SIGNED_OUT") {
          setUser(null);
          syncedUserIdRef.current = null;
          meCacheRef.current = null;
          meInflightRef.current = null;
          lastFetchTimeRef.current = 0;
          setIsLoading(false);
          return;
        }

        if (
          event === "TOKEN_REFRESHED" ||
          event === "INITIAL_SESSION" ||
          event === "USER_UPDATED"
        ) {
          return;
        }

        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          const params = new URLSearchParams(window.location.search);
          const forceManualLogin =
            path.startsWith("/verification") ||
            path.startsWith("/verify") ||
            (path.startsWith("/login") && params.get("verified") === "true");
          if (forceManualLogin) {
            setUser(null);
            syncedUserIdRef.current = null;
            setIsLoading(false);
            return;
          }
        }

        if (!session?.user) return;
        if (!session.user.email_confirmed_at) {
          setUser(null);
          syncedUserIdRef.current = null;
          meCacheRef.current = null;
          void supabase.auth.signOut({ scope: "local" });
          setIsLoading(false);
          return;
        }

        if (event === "SIGNED_IN") {
          // Skip sync if we already have the user loaded for this session
          if (
            bootDone &&
            syncedUserIdRef.current === session.user.id &&
            userRef.current?.id === session.user.id
          ) {
            return;
          }
          void syncUserProfile(session.user).finally(() => {
            if (alive) setIsLoading(false);
          });
        }
      }, 0);
    });

    return () => {
      alive = false;
      clearTimeout(loadingWatchdog);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await loginWithPassword(email, password);
      const authUser = data.user;
      if (!authUser) throw new Error("Login failed");
      syncedUserIdRef.current = null;
      meCacheRef.current = null;
      const name = await syncUserProfile(authUser, { force: true });
      if (!name) {
        throw new Error("Login failed");
      }
      setIsLoading(false);
      trackEvent("auth.login", { userId: authUser.id });
      return { name };
    } catch (err: unknown) {
      trackEvent("auth.login_failed");
      setIsLoading(false);
      if (err instanceof ApiError && err.details && (err.details as { code?: string }).code === "email_not_confirmed") {
        // Clear any leftover client session so /verification does not auto-mark verified
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          /* ignore */
        }
        setUser(null);
        syncedUserIdRef.current = null;
        meCacheRef.current = null;
        throw new Error("Email not confirmed");
      }
      if (err instanceof ApiError && err.details && (err.details as { code?: string }).code === "admin_approval_pending") {
        throw new Error("Admin approval pending");
      }
      if (err instanceof ApiError && err.details && (err.details as { code?: string }).code === "member_approval_pending") {
        throw new Error("Membership approval pending");
      }
      if (
        err instanceof ApiError &&
        err.details &&
        (err.details as { code?: string }).code === "platform_member_approval_pending"
      ) {
        throw new Error("Platform owner approval pending");
      }
      throw new Error(err instanceof Error ? err.message : "Login failed");
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    fitnessData?: FitnessProfileData,
    media?: RegisterMediaFiles,
  ): Promise<string | null> => {
    try {
      const data = await registerAccount(email, password, name, fitnessData, media);
      setUser(null);
      syncedUserIdRef.current = null;
      meCacheRef.current = null;
      trackEvent("auth.register");
      return data.userId;
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Registration failed");
    }
  };

  const updateFitnessProfile = async (userId: string, data: FitnessProfileData): Promise<void> => {
    void userId;
    await updateMyProfile(
      pickAllowedProfileFields(data as Record<string, unknown>) as Parameters<
        typeof updateMyProfile
      >[0],
    );
    trackEvent("profile.update", { userId });
  };

  const checkAccountExists = async (email: string): Promise<boolean | null> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return null;
    try {
      return await apiCheckAccountExists(cleanEmail);
    } catch {
      return null;
    }
  };

  const checkEmailVerified = async (email: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return false;
    try {
      return await apiCheckEmailVerified(cleanEmail);
    } catch {
      return false;
    }
  };

  const resendVerificationEmail = async (email: string): Promise<void> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) throw new Error("Email is required");
    await apiResendVerificationEmail(cleanEmail);
  };

  const updateEmail = async (
    currentEmail: string,
    newEmail: string,
    password?: string,
  ): Promise<void> => {
    const cleanCurrent = currentEmail.trim().toLowerCase();
    const cleanNew = newEmail.trim().toLowerCase();
    if (!cleanNew) throw new Error("New email is required");
    if (!/\S+@\S+\.\S+/.test(cleanNew)) throw new Error("Invalid email format");
    await apiUpdateEmail(cleanCurrent, cleanNew, password);
  };

  const logout = async () => {
    if (logoutBusy) return;
    const name = userRef.current?.name || user?.name || null;
    setLogoutBusy(true);
    setFarewellName(null);

    const tipsHold = delay(1400);

    try {
      await logoutAccount();
    } catch {
      // always clear local state
    } finally {
      await tipsHold;
      setFarewellName(name || "there");
      await delay(1600);

      setUser(null);
      syncedUserIdRef.current = null;
      meCacheRef.current = null;
      meInflightRef.current = null;
      userRef.current = null;

      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const onAuthPage =
          path.startsWith("/login") || path.startsWith("/register");
        if (!onAuthPage) {
          window.location.assign(
            `/login?redirect=${encodeURIComponent(path)}`,
          );
        } else {
          setLogoutBusy(false);
          setFarewellName(null);
        }
      }
    }
  };

  const refreshUser = async () => {
    meCacheRef.current = null;
    meInflightRef.current = null;
    lastFetchTimeRef.current = 0;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await syncUserProfile(session.user, { force: true });
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    updateFitnessProfile,
    checkAccountExists,
    checkEmailVerified,
    resendVerificationEmail,
    updateEmail,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isSuperAdmin: user?.isSuperAdmin === true,
    isTrainer: user?.role === "trainer",
    isVisitor: user?.isVisitor === true,
  };

  if (!mounted) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          isLoading: true,
          login,
          register,
          updateFitnessProfile,
          checkAccountExists,
          checkEmailVerified,
          resendVerificationEmail,
          updateEmail,
          logout,
          refreshUser: async () => {},
          isAuthenticated: false,
          isAdmin: false,
          isSuperAdmin: false,
          isTrainer: false,
          isVisitor: false,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      <AuthBusyOverlay
        busy={logoutBusy}
        mode="logout"
        farewellName={farewellName}
      />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
