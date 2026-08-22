"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, LockKeyhole, Loader2, Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setIsLoading(true);
    try { await login(email, password); toast.success("Login successful!"); router.push("/"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Login failed"); }
    finally { setIsLoading(false); }
  };
  const fillDemoCredentials = (role: "admin" | "customer") => { setEmail(role === "admin" ? "admin@gym.com" : "customer@gym.com"); setPassword(role === "admin" ? "admin123" : "customer123"); };

  return <main className="min-h-screen bg-[#080909] p-2 sm:p-4 lg:p-6"><div className="mx-auto grid min-h-[calc(100vh-1rem)] max-w-[1500px] overflow-hidden rounded-2xl border border-white/10 bg-[#111212] shadow-2xl sm:min-h-[calc(100vh-2rem)] lg:grid-cols-[1.08fr_.92fr] lg:rounded-[2rem]">
    <section aria-label="Forge Gym" className="hidden bg-[url('/auth-gym-hero.png')] bg-cover bg-center lg:block" />
    <section className="flex items-center justify-center bg-[#fcfcfb] px-5 py-12 sm:px-10 lg:px-14"><div className="w-full max-w-md"><Link href="/" className="mb-10 inline-flex items-center gap-2 lg:hidden"><img src="/gym.png" alt="Forge" className="h-11 w-auto" /><span className="text-xs font-bold uppercase tracking-[.2em] text-zinc-500">Forge Gym</span></Link><header className="mb-8 text-center"><p className="mb-3 text-[11px] font-bold uppercase tracking-[.38em] text-primary">Welcome back</p><h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Let&apos;s continue your <span className="text-primary">fitness</span> journey</h2><p className="mt-3 text-sm text-zinc-500">Sign in to your Forge Gym account</p></header>
      <form onSubmit={handleSubmit} className="space-y-5"><div className="space-y-2"><Label htmlFor="email" className="text-zinc-700">Email</Label><div className="relative"><Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={isLoading} className="h-12 border-zinc-200 bg-white pl-11 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-primary" /></div></div><div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password" className="text-zinc-700">Password</Label><button type="button" className="text-xs font-semibold text-primary hover:underline">Forgot password?</button></div><div className="relative"><LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><Input id="password" type="password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isLoading} className="h-12 border-zinc-200 bg-white pl-11 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-primary" /></div></div><label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 accent-red-600" />Remember me</label><div className="border-t border-zinc-200 pt-5"><p className="mb-3 text-xs font-semibold text-zinc-500">DEMO ACCESS</p><div className="grid grid-cols-2 gap-3"><Button type="button" variant="outline" onClick={() => fillDemoCredentials("admin")} disabled={isLoading} className="border-primary/70 text-primary hover:bg-primary hover:text-white">Admin</Button><Button type="button" variant="outline" onClick={() => fillDemoCredentials("customer")} disabled={isLoading} className="border-primary/70 text-primary hover:bg-primary hover:text-white">Customer</Button></div></div><Button type="submit" disabled={isLoading} className="h-12 w-full bg-primary text-base font-bold text-white hover:bg-red-700">{isLoading ? <><Loader2 className="animate-spin" /> Signing in...</> : <>Sign in <ArrowRight /></>}</Button></form><p className="mt-7 text-center text-sm text-zinc-500">Don&apos;t have an account? <Link href="/register" className="font-bold text-primary hover:underline">Sign up</Link></p></div></section>
  </div></main>;
}
