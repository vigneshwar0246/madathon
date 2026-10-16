"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Pulse } from "@phosphor-icons/react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignupPage() {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [success, setSuccess] = useState(false); const [busy, setBusy] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<Array<{ role: string; email: string; password: string }> | null>(null);
  async function provisionDemoAccounts() {
    setBusy(true); setError(""); setDemoAccounts(null);
    try {
      const response = await fetch("/api/demo-accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Demo accounts could not be created.");
      setDemoAccounts(body.accounts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Demo accounts could not be created.");
    } finally { setBusy(false); }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    if (!isSupabaseConfigured) {
      setError("Authentication is not configured. Add the Supabase values to frontend/.env.local and restart the app.");
      setBusy(false);
      return;
    }
    try {
      const { data, error } = await createClient().auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` } });
      if (error) throw error;
      if (data.session) window.location.assign("/onboarding"); else setSuccess(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Sign up failed"); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><div className="auth-glow" /><div className="auth-layout"><div className="auth-story"><Link href="/dashboard" className="brand"><span className="brand-symbol"><Pulse size={25} weight="bold" /></span><span>ReworkIQ<span className="brand-period">.</span><small>WORK INTELLIGENCE</small></span></Link><div><span className="eyebrow">START WITH CONFIDENCE</span><h1>One source of truth<br /><em>for your team.</em></h1><p>Connect delivery, defect history and fair review in a workspace built for growing companies.</p></div><small>© 2026 ReworkIQ. Built for accountable teams.</small></div><section className="auth-card glass"><span className="eyebrow">CREATE YOUR ACCOUNT</span><h2>Get started</h2><p>Your work email will be used to verify your account.</p>{!isSupabaseConfigured && <div className="auth-alert">Supabase is not configured. Add your project keys to .env.local first.</div>}{success ? <div className="auth-success">Check your email for a confirmation link. After confirming, you can create your workspace.</div> : <form onSubmit={submit}><label>Full name<input autoComplete="name" required minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label><label>Work email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" /></label><label>Password<input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 12 characters" /></label>{error && <div className="auth-error" role="alert">{error}</div>}<button className="button button-primary button-wide" disabled={busy || !isSupabaseConfigured}>{busy ? "Creating account..." : "Create account"}<ArrowRight size={17} /></button></form>}  {demoAccounts && <div className="auth-success" role="status">Four confirmed demo accounts are ready. Use the credentials below on the sign-in page.{demoAccounts.map(account => <div key={account.email}><strong>{account.role}</strong>: {account.email} / {account.password}</div>)}</div>}<div className="auth-card-footer">Already have an account? <Link href="/login">Sign in</Link><button type="button" className="button button-secondary button-wide" onClick={provisionDemoAccounts} disabled={busy || !isSupabaseConfigured}>Create demo portal accounts</button></div></section></div></main>;
}
