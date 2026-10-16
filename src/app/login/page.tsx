"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Pulse, ShieldCheck } from "@phosphor-icons/react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const { error } = await createClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.assign("/dashboard");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Sign in failed"); setBusy(false); }
  }
  return <main className="auth-page"><div className="auth-glow" /><div className="auth-layout"><div className="auth-story"><Link href="/dashboard" className="brand"><span className="brand-symbol"><Pulse size={25} weight="bold" /></span><span>vetra<span className="brand-period">.</span><small>WORK INTELLIGENCE</small></span></Link><div><span className="eyebrow">WORK, QUALITY & PAY</span><h1>Clarity across<br /><em>every delivery.</em></h1><p>One secure workspace for assignments, corrective work, decisions and payroll review.</p><div className="auth-proof"><ShieldCheck size={19} /> Company scoped access with traceable decisions</div></div><small>© 2026 Vetra. Built for accountable teams.</small></div><section className="auth-card glass"><span className="eyebrow">WELCOME BACK</span><h2>Sign in to Vetra</h2><p>Access your organisation workspace.</p>{!isSupabaseConfigured && <div className="auth-alert">Supabase is not configured. Add your project URL and publishable key to .env.local first.</div>}<form onSubmit={submit}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" /></label>{error && <div className="auth-error" role="alert">{error}</div>}<button className="button button-primary button-wide" disabled={busy || !isSupabaseConfigured}>{busy ? "Signing in..." : "Sign in"}<ArrowRight size={17} /></button></form><div className="auth-card-footer">New to Vetra? <Link href="/signup">Create an account</Link></div></section></div></main>;
}
