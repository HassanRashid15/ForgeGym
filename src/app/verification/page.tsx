"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { markEmailVerified, logoutAccount } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Mail,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Radio,
} from "lucide-react";

function VerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkEmailVerified, resendVerificationEmail } = useAuth();

  const queryEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(queryEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!queryEmail);
  const [tempEmail, setTempEmail] = useState(queryEmail);

  const [isChecking, setIsChecking] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isVerifiedRef = useRef(false);

  // Sync state if query param arrives or changes
  useEffect(() => {
    if (queryEmail && !email) {
      setEmail(queryEmail);
      setTempEmail(queryEmail);
      setIsEditingEmail(false);
    }
  }, [queryEmail, email]);

  // Handle successful verification — clear any auto-session, then send user to login
  const handleVerificationSuccess = useCallback(async () => {
    if (isVerifiedRef.current) return;
    isVerifiedRef.current = true;
    setIsVerified(true);
    toast.success("Email verified successfully! 🎉");

    const targetEmail = (email || queryEmail).trim().toLowerCase();

    // Persist app-level verified flag while confirmation session may still exist
    try {
      await markEmailVerified();
    } catch {
      // trigger / polling may have already set is_verified
    }

    // Email confirm links create a Supabase session — sign out so user logs in manually
    try {
      await logoutAccount();
    } catch {
      // ignore
    }

    let count = 2;
    setRedirectCountdown(count);

    redirectTimerRef.current = setInterval(() => {
      count -= 1;
      setRedirectCountdown(count);
      if (count <= 0) {
        if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
        toast.info("Please log in with your credentials to continue");
        router.replace(
          `/login?verified=true${targetEmail ? `&email=${encodeURIComponent(targetEmail)}` : ""}`
        );
      }
    }, 1000);
  }, [email, queryEmail, router]);

  const handleProceed = async () => {
    if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    const targetEmail = (email || queryEmail).trim().toLowerCase();

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // ignore
    }

    router.replace(
      `/login?verified=true${targetEmail ? `&email=${encodeURIComponent(targetEmail)}` : ""}`
    );
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    };
  }, []);

  // Cooldown countdown for resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Manual or programmatic verification check
  const performCheck = useCallback(
    async (silent = false) => {
      if (!email || isVerifiedRef.current) return;
      if (!silent) setIsChecking(true);

      try {
        setCheckCount((c) => c + 1);
        const verified = await checkEmailVerified(email);
        if (verified) {
          handleVerificationSuccess();
        } else if (!silent) {
          toast.info("Database check: Not verified yet. Please click the link in your email.");
        }
      } catch {
        if (!silent) {
          toast.error("Check failed. We will keep listening in real time.");
        }
      } finally {
        if (!silent) setIsChecking(false);
      }
    },
    [email, checkEmailVerified, handleVerificationSuccess]
  );

  // 1. Supabase Realtime Listener (WebSocket) on public.profiles table
  useEffect(() => {
    if (!email || isVerified) return;

    const channel = supabase
      .channel(`verification-${email.toLowerCase().replace(/[^a-z0-9]/g, "_")}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          const row = (payload.new || {}) as { email?: string; is_verified?: boolean };
          if (
            row?.email?.toLowerCase() === email.toLowerCase() &&
            row?.is_verified === true
          ) {
            handleVerificationSuccess();
          }
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [email, isVerified, handleVerificationSuccess]);

  // 2. Supabase Auth State Change (catches magic link / token redirect in same browser)
  useEffect(() => {
    if (isVerified) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (session.user as any).email_confirmed_at) {
        if (
          !email ||
          session.user.email?.toLowerCase() === email.toLowerCase()
        ) {
          handleVerificationSuccess();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [email, isVerified, handleVerificationSuccess]);

  // 3. Database Polling Loop: real-time fallback every 2.5 seconds
  useEffect(() => {
    if (!email || isVerified) return;

    // Check immediately
    performCheck(true);

    const interval = setInterval(() => {
      performCheck(true);
    }, 2500);

    return () => clearInterval(interval);
  }, [email, isVerified, performCheck]);

  // Resend email handler
  const handleResend = async () => {
    if (!email) {
      toast.error("Please provide your email address");
      return;
    }
    if (resendCooldown > 0) return;

    setIsResending(true);
    try {
      await resendVerificationEmail(email);
      toast.success("Verification link resent! Please check your inbox & spam folder.");
      setResendCooldown(60);
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend email. Please try again in a moment.");
    } finally {
      setIsResending(false);
    }
  };

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempEmail.trim() || !/\S+@\S+\.\S+/.test(tempEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setEmail(tempEmail.trim());
    setIsEditingEmail(false);
    toast.success("Listening for verification on: " + tempEmail.trim());
  };

  return (
    <div className="h-screen w-screen overflow-hidden grid lg:grid-cols-2 bg-black">
      {/* Left — Image Panel with Brand Overlay */}
      <aside className="hidden lg:flex flex-col relative overflow-hidden">
        <img
          src="/gymauth.png"
          alt="Gym"
          className="w-full h-full object-cover"
          style={{ objectPosition: "10% 30%" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
        <div className="absolute z-10 flex flex-col h-full justify-between p-10 xl:p-14">
          <div>
            <img src="/forge.png" alt="Forge Gym Logo" className="w-40 h-10 object-contain" />
          </div>

          <div className="max-w-md">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30 mb-4">
              <ShieldCheck className="w-3.5 h-3.5" /> Fast & Secure Verification
            </span>
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-3">
              One Step Away from Unlocking Your Peak.
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              We uphold the highest security standards for our members. Verify your email to activate
              your personalized workout tracker and member dashboard.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span>© {new Date().getFullYear()} Forge Gym</span>
            <span>•</span>
            <span>Real-time Account Sync</span>
          </div>
        </div>
      </aside>

      {/* Right — Verification Center Panel */}
      <section className="flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-[480px] border border-red-500/30 rounded-2xl bg-zinc-900/60 backdrop-blur-md p-8 sm:p-10 shadow-2xl shadow-red-500/10">
          
          {/* Mobile Logo */}
          <Link
            href="/"
            className="mb-3 block h-7 w-[7.25rem] overflow-hidden lg:hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/preloader_logo.png"
              alt="Forge Gym"
              className="block h-9 w-full object-cover object-top"
            />
          </Link>

          {!isVerified ? (
            /* ════════════════ Waiting for Verification State ════════════════ */
            <div className="space-y-6">
              <div className="text-center">
                {/* Live Radar Pulse Icon */}
                <div className="relative inline-flex items-center justify-center w-20 h-20 mb-5">
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                  <div className="absolute inset-1 rounded-full bg-red-500/10 border border-red-500/40 animate-pulse" />
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/40">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30 mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {realtimeConnected ? "Database Live Sync Active" : "Checking Database Real-time"}
                </div>

                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Verify Your Email
                </h1>
                <p className="mt-2 text-sm text-zinc-400">
                  We sent a confirmation link to your inbox. Click it on any device to activate your account.
                </p>
              </div>

              {/* Email Display / Change Box */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-black/40 text-center space-y-2">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                  Target Account
                </span>
                {!isEditingEmail && email ? (
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-base font-bold text-white break-all">{email}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setTempEmail(email);
                        setIsEditingEmail(true);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2 ml-1"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSaveEmail} className="flex gap-2 pt-1">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
                      className="h-10 text-sm bg-zinc-900 border-zinc-700 text-white rounded-lg focus-visible:ring-red-500"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="h-10 bg-red-600 hover:bg-red-500 text-white px-4 rounded-lg font-semibold"
                    >
                      Set
                    </Button>
                  </form>
                )}
              </div>

              {/* Real-time Status Card */}
              <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-zinc-300 flex items-start gap-3">
                <Radio className="w-4 h-4 text-red-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">Automatic Redirection</p>
                  <p className="text-zinc-400 leading-relaxed">
                    As soon as you click the verification link on any device, our system will
                    confirm your account and redirect you to the login page to sign in.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  onClick={() => performCheck(false)}
                  disabled={isChecking}
                  className="h-12 w-full rounded-xl bg-[#EF1111] text-sm font-bold text-white shadow-lg hover:bg-[#C90808] active:bg-[#A90606] transition-all"
                  style={{ boxShadow: "0 10px 30px rgba(239,17,17,0.3)" }}
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking Database...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      I&apos;ve Verified My Email
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResend}
                  disabled={isResending || resendCooldown > 0}
                  className="h-11 w-full rounded-xl border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all text-xs"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Sending new email...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend email in ${resendCooldown}s`
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      Resend Verification Link
                    </>
                  )}
                </Button>
              </div>

              {/* Footer Links */}
              <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800/80">
                <Link
                  href="/login"
                  className="hover:text-zinc-300 transition-colors"
                >
                  ← Return to Sign in
                </Link>
                <Link
                  href="/register"
                  className="text-red-500 hover:text-red-400 font-medium transition-colors"
                >
                  Create new account
                </Link>
              </div>
            </div>
          ) : (
            /* ════════════════ Verified Success State ════════════════ */
            <div className="text-center py-4 space-y-6">
              <div className="relative inline-flex items-center justify-center w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5" /> Verified in Database
                </span>
                <h2 className="text-2xl font-extrabold text-white">
                  Email Confirmed! 🎉
                </h2>
                <p className="text-sm text-zinc-300">
                  Your Forge Gym account is fully activated and ready.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-sm text-emerald-300 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>
                  Auto redirecting to login page in{" "}
                  <strong className="text-white text-base">{redirectCountdown}s</strong>...
                </span>
              </div>

              <Button
                onClick={handleProceed}
                className="h-12 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition-all"
              >
                Go to Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function VerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      }
    >
      <VerificationContent />
    </Suspense>
  );
}
