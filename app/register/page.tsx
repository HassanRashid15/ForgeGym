"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowRight, LockKeyhole, Loader2, Mail, UserRound } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter(); const { register } = useAuth();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState(""); const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (event: React.FormEvent) => { event.preventDefault(); setIsLoading(true); try { if (password !== confirmPassword) throw new Error("Passwords do not match"); if (password.length < 6) throw new Error("Password must be at least 6 characters"); await register(email, password, name); toast.success("Registration successful!"); router.push("/"); } catch (error) { toast.error(error instanceof Error ? error.message : "Registration failed"); } finally { setIsLoading(false); } };
  const fieldClass = "h-11 border-zinc-200 bg-white pl-10 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-primary";
  return <main className="min-h-screen bg-[#080909] p-2 sm:p-4 lg:p-6"><div className="mx-auto grid min-h-[calc(100vh-1rem)] max-w-[1500px] overflow-hidden rounded-2xl border border-white/10 bg-[#111212] shadow-2xl sm:min-h-[calc(100vh-2rem)] lg:grid-cols-[1.08fr_.92fr] lg:rounded-[2rem]">
    <section aria-label="Forge Gym" className="hidden bg-[url('/auth-gym-hero.png')] bg-cover bg-center lg:block" />
    <section className="flex items-center justify-center bg-[#fcfcfb] px-5 py-10 sm:px-10 lg:px-14"><div className="w-full max-w-md"><Link href="/" className="mb-7 inline-flex items-center gap-2 lg:hidden"><img src="/gym.png" alt="Forge" className="h-11 w-auto" /><span className="text-xs font-bold uppercase tracking-[.2em] text-zinc-500">Forge Gym</span></Link><header className="mb-7 text-center"><p className="mb-3 text-[11px] font-bold uppercase tracking-[.38em] text-primary">Join the movement</p><h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">Begin your <span className="text-primary">fitness</span> journey</h2><p className="mt-3 text-sm text-zinc-500">Create your Forge Gym account in a minute.</p></header><form onSubmit={handleSubmit} className="space-y-4"><Field id="name" label="Full name" placeholder="John Doe" value={name} onChange={setName} icon={UserRound} className={fieldClass} /><Field id="email" label="Email" type="email" placeholder="your@email.com" value={email} onChange={setEmail} icon={Mail} className={fieldClass} /><div className="grid gap-4 sm:grid-cols-2"><Field id="password" label="Password" type="password" placeholder="••••••" value={password} onChange={setPassword} icon={LockKeyhole} className={fieldClass} /><Field id="confirmPassword" label="Confirm password" type="password" placeholder="••••••" value={confirmPassword} onChange={setConfirmPassword} icon={LockKeyhole} className={fieldClass} /></div><Button type="submit" disabled={isLoading} className="mt-2 h-12 w-full bg-primary text-base font-bold text-white hover:bg-red-700">{isLoading ? <><Loader2 className="animate-spin" /> Creating account...</> : <>Create account <ArrowRight /></>}</Button></form><p className="mt-6 text-center text-sm text-zinc-500">Already a member? <Link href="/login" className="font-bold text-primary hover:underline">Sign in</Link></p></div></section>
  </div></main>;
}

function Field({ id, label, type = "text", placeholder, value, onChange, icon: Icon, className }: { id: string; label: string; type?: string; placeholder: string; value: string; onChange: (value: string) => void; icon: typeof UserRound; className: string }) {
  return <div className="space-y-2"><Label htmlFor={id} className="text-zinc-700">{label}</Label><div className="relative"><Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><Input id={id} type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} required minLength={type === "password" ? 6 : undefined} className={className} /></div></div>;
}
