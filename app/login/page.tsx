"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Invalid email format";
    
    if (!password) newErrors.password = "Password is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back! Let's crush it today.");
      router.push("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (role: "admin" | "customer") => {
    setEmail(role === "admin" ? "admin@gym.com" : "customer@gym.com");
    setPassword(role === "admin" ? "admin123" : "customer123");
    setErrors({});
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
          className="  w-full h-full object-cover"
          style={{ objectPosition: "10% 30%" }}
        />
        {/* Dark gradient overlay for better text visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40" />

        <div className=" absolute z-10 flex-col h-full p-10 xl:p-14">
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

      <p className="text-[17px] font-medium text-white">
        {feature}
      </p>
    </div>
  ))}
</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════ RIGHT — Form Panel ═══════════════ */}
      <section className="flex flex-col items-center justify-center bg-black overflow-y-auto px-8 py-12 sm:px-12">
        <div className="w-full max-w-[400px] border border-red-500/30 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-8 shadow-2xl shadow-red-500/10">

          {/* Mobile logo */}
          <Link href="/" className="mb-6 inline-flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-md shadow-red-500/30">
              <Flame className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-white">Forge Gym</span>
          </Link>

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

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-zinc-300 font-medium text-sm">
                Email address
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  required
                  disabled={isLoading}
                  className={`h-11 rounded-xl pl-10 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
                    errors.email
                      ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500'
                      : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400 mt-1">{errors.email}</p>
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
                  className="text-xs font-semibold text-red-500 hover:text-red-600 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  required
                  disabled={isLoading}
                  className={`h-11 rounded-xl pl-10 text-white placeholder:text-zinc-500 focus-visible:ring-red-500 transition-colors ${
                    errors.password
                      ? 'border-red-500 bg-red-500/10 focus-visible:border-red-500'
                      : 'border-zinc-700 bg-zinc-900 focus-visible:border-red-400'
                  }`}
                />
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
              disabled={isLoading}
              className="h-12 w-full rounded-xl bg-[#EF1111] text-sm font-bold text-white shadow-lg hover:bg-[#C90808] active:bg-[#A90606] transition-all"
              style={{ boxShadow: '0 10px 40px rgba(239, 17, 17, 0.35)' }}
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

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-700" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Demo access
              </span>
              <div className="h-px flex-1 bg-zinc-700" />
            </div>

            {/* Demo buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => fillDemo("admin")}
                disabled={isLoading}
                className="h-10 rounded-xl border-red-500/50 text-red-400 text-sm font-semibold hover:bg-red-500/10 hover:border-red-500 transition-colors"
              >
                Admin demo
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fillDemo("customer")}
                disabled={isLoading}
                className="h-10 rounded-xl border-red-500/50 text-red-400 text-sm font-semibold hover:bg-red-500/10 hover:border-red-500 transition-colors"
              >
                Member demo
              </Button>
            </div>
          </form>
          {/* Footer */}
          <p className="mt-6 text-center text-sm text-zinc-400">
            New to Forge Gym?{" "}
            <Link
              href="/register"
              className="font-semibold text-red-500 hover:text-red-600 underline-offset-2 hover:underline transition-colors"
            >
              Create a free account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
