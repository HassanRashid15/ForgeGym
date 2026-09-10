"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowRight,
  LockKeyhole,
  Loader2,
  Mail,
  Flame,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserX,
} from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, checkAccountExists, user, isLoading: isAuthLoading } = useAuth();

  const queryVerified = searchParams.get("verified") === "true";
  const queryEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(queryEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // If already logged in, redirect to dashboard — except right after email verification
  // (user must sign in manually with password)
  useEffect(() => {
    if (queryVerified) return;
    if (!isAuthLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isAuthLoading, router, queryVerified]);

  // Prefill from query if present
  useEffect(() => {
    if (queryEmail) {
      setEmail(queryEmail);
    }
    if (queryVerified) {
      // Drop any session created by the email confirm link
      void supabase.auth.signOut({ scope: "local" });
      toast.success("Email verified successfully! Please sign in to continue.");
    }
  }, [queryEmail, queryVerified]);

  // Real-time account check state
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(false);
  const [pendingAdminApproval, setPendingAdminApproval] = useState(false);
  const [pendingMemberApproval, setPendingMemberApproval] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time DB check whenever email changes (debounced 450ms)
  const handleEmailChange = (newVal: string) => {
    setEmail(newVal);
    setUnconfirmedEmail(false);
    setPendingAdminApproval(false);
    setPendingMemberApproval(false);
    setAccountExists(null);

    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const clean = newVal.trim().toLowerCase();
    // Only check once a valid email format is entered
    if (!clean || !/\S+@\S+\.\S+/.test(clean)) {
      return;
    }

    setIsCheckingAccount(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const exists = await checkAccountExists(clean);
        setAccountExists(exists);
        if (exists === false) {
          setErrors((prev) => ({
            ...prev,
            email: "No account found with this email in our system.",
          }));
        } else {
          setErrors((prev) => ({ ...prev, email: undefined }));
        }
      } catch {
        // Fallback: don't block on network error
        setAccountExists(null);
      } finally {
        setIsCheckingAccount(false);
      }
    }, 450);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanEmail = email.trim();
    const newErrors: { email?: string; password?: string } = {};

    if (!cleanEmail) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(cleanEmail)) newErrors.email = "Invalid email format";

    if (!password) newErrors.password = "Password is required";

    if (accountExists === false) {
      newErrors.email = "No account found with this email in our system.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    setPendingAdminApproval(false);
    setPendingMemberApproval(false);
    try {
      await login(cleanEmail, password);
      toast.success("Welcome back! Let's crush it today.");
      router.push("/dashboard");
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : "Login failed";
      const lower = msg.toLowerCase();

      if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
        setUnconfirmedEmail(true);
        toast.error("Your email is not verified yet. Redirecting to verification...");
        setTimeout(() => {
          router.push(`/verification?email=${encodeURIComponent(cleanEmail)}`);
        }, 1000);
      } else if (
        lower.includes("admin approval pending") ||
        lower.includes("pending super admin")
      ) {
        setPendingAdminApproval(true);
        toast.error("Waiting for super admin approval. You cannot sign in yet.");
      } else if (
        lower.includes("membership approval pending") ||
        lower.includes("pending gym admin")
      ) {
        setPendingMemberApproval(true);
        toast.error("Waiting for gym admin approval. You cannot sign in yet.");
      } else if (lower.includes("invalid login credentials")) {
        toast.error("Invalid email or password. Please check your credentials.");
      } else {
        console.warn("Login failed:", msg);
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const FEATURES = [
    "State-of-the-Art Equipment",
    "World-Class Trainers",
    "Round-the-Clock Access",
    "Supportive Community",
  ];

  return (
    <div className="h-screen w-screen overflow-hidden grid lg:grid-cols-2">
      {/* ═══════════════ LEFT — Image Panel ═══════════════ */}
      <aside className="hidden lg:flex flex-col relative overflow-hidden">
        <img
          src="/gymauth.png"
          alt="Gym"
          className="w-full h-full object-cover"
          style={{ objectPosition: "10% 30%" }}
        />
        {/* Dark gradient overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />

        <div className="absolute z-10 flex-col h-full p-10 xl:p-14">
          <div className="mb-8">
            <img src="/forge.png" alt="Forge Gym Logo" className="w-40 h-10 object-contain" />
          </div>
          <div className="max-w-full flex flex-col h-full justify-center">
            <div>
              <h2 className="text-5xl font-bold mb-4 !leading-[3.5rem]">
                <span className="text-red-500">BUILD</span> <span className="text-white">DISCIPLINE.</span>
                <br />
                <span className="text-white">BECOME</span> <span className="text-red-500">STRONGER.</span>
              </h2>
              <p className="text-sm text-zinc-300 mb-6">
                Your transformation starts here. Train smarter. Live better.
              </p>

              <div className="grid grid-cols-2 gap-6">
                {FEATURES.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-4 p-4 border border-red-500/70 rounded-xl bg-black/30 backdrop-blur-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] shrink-0" />
                    <p className="text-[17px] font-medium text-white">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════ RIGHT — Form Panel ═══════════════ */}
      <section className="flex flex-col items-center justify-center bg-black overflow-y-auto px-8 py-12 sm:px-12">
        <div className="w-full max-w-[420px] border border-red-500/30 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-8 shadow-2xl shadow-red-500/10">
          
          {/* Mobile logo */}
          <Link href="/" className="mb-6 inline-flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-md shadow-red-500/30">
              <Flame className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-white">Forge Gym</span>
          </Link>

          {/* Verification Banner if arrived from /verification */}
          {queryVerified && (
            <div className="mb-6 p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-emerald-300">Email Verified!</p>
                <p className="text-zinc-300">You can now sign in to your dashboard.</p>
              </div>
            </div>
          )}

          {/* Unconfirmed Email Alert */}
          {unconfirmedEmail && (
            <div className="mb-6 p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-300">Email Not Verified</p>
                <p className="text-zinc-300 leading-relaxed">
                  Please verify your email address to log in.
                </p>
                <Link
                  href={`/verification?email=${encodeURIComponent(email)}`}
                  className="inline-flex items-center gap-1 font-semibold text-red-400 hover:text-red-300 underline underline-offset-2 pt-1"
                >
                  Go to verification page →
                </Link>
              </div>
            </div>
          )}

          {/* Pending Admin Approval Alert — stay on login */}
          {pendingAdminApproval && (
            <div className="mb-6 p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-300">Awaiting Super Admin Approval</p>
                <p className="text-zinc-300 leading-relaxed">
                  Your email is verified, but a super admin must approve your admin account
                  before you can sign in. Please stay on this page and try again later.
                </p>
              </div>
            </div>
          )}

          {/* Pending gym member approval */}
          {pendingMemberApproval && (
            <div className="mb-6 p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-amber-300">Awaiting Gym Admin Approval</p>
                <p className="text-zinc-300 leading-relaxed">
                  Your email is verified, but the gym admin must approve your membership
                  before you can sign in. Try again after they approve you.
                </p>
              </div>
            </div>
          )}

          {/* Heading */}
          <header className="mb-6">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.38em] text-red-500">
              Welcome back
            </p>
            <h2 className="text-[1.75rem] font-extrabold tracking-tight text-white leading-tight">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Continue your fitness journey where you left off.
            </p>
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            
            {/* Email Field with Real-time DB Check */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email" className="text-zinc-300 font-medium text-sm">
                  Email address
                </Label>
                {/* Real-time DB Status Indicator */}
                {isCheckingAccount && (
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin text-red-500" />
                    Checking DB...
                  </span>
                )}
                {accountExists === true && !isCheckingAccount && (
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Account found
                  </span>
                )}
              </div>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                  disabled={isLoading}
                  className={`h-11 rounded-xl pl-10 pr-10 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
                    errors.email || accountExists === false
                      ? "border-red-500 bg-red-500/10 focus-visible:border-red-500"
                      : accountExists === true
                      ? "border-emerald-500/60 bg-zinc-900 focus-visible:border-emerald-400"
                      : "border-zinc-700 bg-zinc-900 focus-visible:border-red-400"
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                  {isCheckingAccount ? (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                  ) : accountExists === false ? (
                    <UserX className="h-4 w-4 text-red-400" />
                  ) : accountExists === true ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : null}
                </div>
              </div>

              {/* Dynamic Real-time Inline Error */}
              {(errors.email || accountExists === false) && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 mt-1 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <div className="leading-snug">
                    <span className="font-semibold">Account Not Found: </span>
                    <span>No member registered with this email. </span>
                    <Link
                      href={`/register${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                      className="font-bold text-white underline underline-offset-2 hover:text-red-300 ml-1 inline-block"
                    >
                      Create account →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-300 font-medium text-sm">
                  Password
                </Label>
                <button
                  type="button"
                  className="text-xs font-semibold text-red-500 hover:text-red-400 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  required
                  disabled={isLoading}
                  className={`h-11 rounded-xl pl-10 pr-10 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
                    errors.password
                      ? "border-red-500 bg-red-500/10 focus-visible:border-red-500"
                      : "border-zinc-700 bg-zinc-900 focus-visible:border-red-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 mt-1">{errors.password}</p>
              )}
            </div>

            {/* Remember me */}
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-400 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded accent-red-600"
              />
              Keep me signed in
            </label>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading || accountExists === false}
              className="h-12 w-full rounded-xl bg-[#EF1111] text-sm font-bold text-white shadow-lg hover:bg-[#C90808] active:bg-[#A90606] transition-all disabled:opacity-50"
              style={{ boxShadow: "0 10px 40px rgba(239, 17, 17, 0.35)" }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-zinc-400">
            New to Forge Gym?{" "}
            <Link
              href="/register"
              className="font-semibold text-red-500 hover:text-red-400 underline-offset-2 hover:underline transition-colors"
            >
              Create a free account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
