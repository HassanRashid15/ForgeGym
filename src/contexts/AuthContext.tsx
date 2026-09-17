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
  fetchCurrentUser,
} from "@/api/auth";
import { updateMyProfile } from "@/api/profiles";
import { pickAllowedProfileFields } from "@/lib/profiles/allowlist";
import { ApiError } from "@/api/client";
import { isSeededSuperAdmin, resolveRole } from "@/lib/auth/roles";
import {
  MePayload,
  MeCacheEntry,
  readMeCache,
  writeMeCache,
  withTimeout,
} from "@/lib/auth/me-cache";
import { trackEvent, trackException } from "@/lib/monitoring";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const userRef = useRef<User | null>(null);
  const syncGenRef = useRef(0);
  const syncedUserIdRef = useRef<string | null>(null);
  const meCacheRef = useRef<MeCacheEntry | null>(null);
  const meInflightRef = useRef<Promise<MePayload | null> | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const getMeOnce = async (userId: string, force = false): Promise<MePayload | null> => {
    if (!force) {
      const cached = readMeCache(meCacheRef.current, userId);
      if (cached) return cached;
      if (meInflightRef.current) return meInflightRef.current;
    }

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
  ) => {
    if (!sessionUser?.id) return;

    const force = options?.force === true;
    const userId = sessionUser.id;
    const userEmail = (sessionUser.email || "").toLowerCase();

    if (!force && syncedUserIdRef.current === userId && userRef.current?.id === userId) {
      return;
    }

    const gen = ++syncGenRef.current;
    const fallbackName =
      (sessionUser.user_metadata?.full_name as string | undefined) ||
      userEmail.split("@")[0] ||
      "User";
    const isSeededSuper = isSeededSuperAdmin(userEmail);
    const keepAdmin =
      userRef.current?.id === userId && userRef.current.role === "admin";

    if (!userRef.current || userRef.current.id !== userId) {
      setUser({
        id: userId,
        email: userEmail,
        name: fallbackName,
        role: isSeededSuper || keepAdmin ? "admin" : "customer",
        isSuperAdmin:
          isSeededSuper ||
          (userRef.current?.id === userId ? !!userRef.current.isSuperAdmin : false),
        avatar: (sessionUser.user_metadata?.avatar_url as string | undefined) || undefined,
      });
    }

    try {
      const me = await getMeOnce(userId, force);
      if (gen !== syncGenRef.current) return;

      if (!me) {
        // /api/auth/me failed (timeout/network) — do not force customer.
        // Prefer JWT requested_role for gym owners until a successful me sync.
        const metaRole = String(
          sessionUser.user_metadata?.requested_role || "",
        ).toLowerCase();
        const fallbackRole =
          isSeededSuper || metaRole === "admin" || metaRole === "super_admin"
            ? "admin"
            : keepAdmin
              ? "admin"
              : "customer";
        setUser({
          id: userId,
          email: userEmail,
          name: fallbackName,
          role: fallbackRole,
          isSuperAdmin: isSeededSuper,
          avatar:
            (sessionUser.user_metadata?.avatar_url as string | undefined) ||
            undefined,
        });
        syncedUserIdRef.current = userId;
        return;
      }

      let appRole = resolveRole(
        me.role,
        sessionUser.user_metadata?.requested_role as string | undefined,
      );
      if (isSeededSuper) appRole = "admin";

      const isSuperAdmin = me.isSuperAdmin === true || isSeededSuper;
      const apiApproved = me.admin_approved !== false;
      const needsGymMemberApproval =
        appRole === "customer" && !!me.gymOwnerId && !apiApproved;

      if (!isSuperAdmin && me.is_verified !== true) {
        meCacheRef.current = null;
        syncedUserIdRef.current = null;
        await supabase.auth.signOut({ scope: "local" });
        setUser(null);
        return;
      }

      if (
        ((appRole === "admin" && !apiApproved) || needsGymMemberApproval) &&
        !isSuperAdmin
      ) {
        meCacheRef.current = null;
        syncedUserIdRef.current = null;
        await supabase.auth.signOut({ scope: "local" });
        setUser(null);
        return;
      }

      syncedUserIdRef.current = userId;
      const nextUser = {
        id: userId,
        email: me.email || userEmail,
        name: me.name || fallbackName,
        role: appRole,
        isSuperAdmin,
        avatar: me.avatar || (sessionUser.user_metadata?.avatar_url as string | undefined) || undefined,
        gymName: me.gymName || null,
        gymOwnerId: me.gymOwnerId || null,
        gymCity: me.gymCity || null,
        gymType: me.gymType || null,
        gymMainImageUrl: me.gymMainImageUrl || null,
        membershipStatus: me.membershipStatus || null,
        membershipType: me.membershipType || null,
        trial: me.trial || null,
      };
      const prev = userRef.current;
      const unchanged =
        prev &&
        prev.id === nextUser.id &&
        prev.email === nextUser.email &&
        prev.name === nextUser.name &&
        prev.role === nextUser.role &&
        prev.isSuperAdmin === nextUser.isSuperAdmin &&
        prev.avatar === nextUser.avatar &&
        prev.gymName === nextUser.gymName &&
        prev.gymOwnerId === nextUser.gymOwnerId &&
        prev.gymCity === nextUser.gymCity &&
        prev.gymType === nextUser.gymType &&
        prev.gymMainImageUrl === nextUser.gymMainImageUrl &&
        prev.membershipStatus === nextUser.membershipStatus &&
        prev.membershipType === nextUser.membershipType &&
        prev.trial?.status === nextUser.trial?.status &&
        prev.trial?.daysLeft === nextUser.trial?.daysLeft;
      if (!unchanged) setUser(nextUser);
    } catch (error) {
      trackException(error, { action: "syncUserProfile" });
      if (!userRef.current) {
        setUser({
          id: userId,
          email: userEmail,
          name: fallbackName,
          role: isSeededSuper ? "admin" : "customer",
          isSuperAdmin: isSeededSuper,
          avatar: (sessionUser.user_metadata?.avatar_url as string | undefined) || undefined,
        });
      }
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
      await syncUserProfile(authUser, { force: true });
      setIsLoading(false);
      trackEvent("auth.login", { userId: authUser.id });
    } catch (err: unknown) {
      trackEvent("auth.login_failed");
      setIsLoading(false);
      if (err instanceof ApiError && err.details && (err.details as { code?: string }).code === "email_not_confirmed") {
        throw new Error("Email not confirmed");
      }
      if (err instanceof ApiError && err.details && (err.details as { code?: string }).code === "admin_approval_pending") {
        throw new Error("Admin approval pending");
      }
      if (err instanceof ApiError && err.details && (err.details as { code?: string }).code === "member_approval_pending") {
        throw new Error("Membership approval pending");
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

  const logout = async () => {
    try {
      await logoutAccount();
    } catch {
      // always clear local state
    } finally {
      setUser(null);
      syncedUserIdRef.current = null;
      meCacheRef.current = null;
      meInflightRef.current = null;
      userRef.current = null;
      // Hard navigate so protected routes re-run auth and land on login
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const onAuthPage = path.startsWith("/login") || path.startsWith("/register");
        if (!onAuthPage) {
          window.location.assign(`/login?redirect=${encodeURIComponent(path)}`);
        }
      }
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
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isSuperAdmin: user?.isSuperAdmin === true,
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
          logout,
          isAuthenticated: false,
          isAdmin: false,
          isSuperAdmin: false,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
