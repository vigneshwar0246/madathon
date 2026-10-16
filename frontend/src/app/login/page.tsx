"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Layers3, LockKeyhole, ShieldCheck, UserRound, UsersRound, CircleDollarSign } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const roles = [
  { name: "Employee", icon: UserRound },
  { name: "Team Lead", icon: Layers3 },
  { name: "Manager", icon: UsersRound },
  { name: "Finance Admin", icon: CircleDollarSign }
];

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Employee");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!identifier.trim() || !password) {
      setMessage("Enter your email or employee ID and password to continue.");
      return;
    }
    if (!isSupabaseConfigured) {
      setMessage("Authentication is not configured. Add the Supabase values to frontend/.env.local and restart the app.");
      return;
    }
    if (!identifier.includes("@")) {
      setMessage("Sign in with the verified email address connected to your employee profile.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await createClient().auth.signInWithPassword({ email: identifier.trim().toLowerCase(), password });
      if (error) throw error;
      const bootstrap = await fetch("/api/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body = await bootstrap.json();
      if (!bootstrap.ok) throw new Error(body.error ?? "Your workspace could not be loaded.");
      const destination = body.identity?.role === "team_lead" ? "/lead" : body.identity?.role === "employee" ? "/employee" : body.identity?.role === "manager" ? "/manager" : body.identity?.role === "payroll_admin" ? "/finance" : null;
      if (!destination) {
        await createClient().auth.signOut();
        throw new Error("This account does not have an enabled portal role.");
      }
      window.location.assign(destination);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Sign in failed. Check your account and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="rework-login">
    <section className="login-intro" aria-labelledby="login-title">
      <div className="intro-content">
        <Link href="/login" className="rework-mark" aria-label="Rework-Aware home">
          <span className="mark-icon"><Layers3 size={22} strokeWidth={2.2} /></span>
          <span><strong>Rework-Aware</strong><small>Task Tracking &amp; Payroll Management</small></span>
        </Link>
        <div className="intro-copy">
          <span className="login-kicker">WORKSPACE ACCESS</span>
          <h1 id="login-title">Every task.<br /><em>Every hour.</em><br />Accounted for.</h1>
          <p>Track deliverables, manage corrective work, and bring transparency to every payroll decision.</p>
          <ul className="feature-list">
            <li><span><Check size={15} /></span><div><strong>Task Lifecycle Tracking</strong><small>See work clearly from commitment to completion.</small></div></li>
            <li><span><Check size={15} /></span><div><strong>Corrective Work Monitoring</strong><small>Connect rework hours to the original delivery.</small></div></li>
            <li><span><Check size={15} /></span><div><strong>Transparent Payroll Reviews</strong><small>Make deductions traceable, fair, and reviewable.</small></div></li>
          </ul>
        </div>
        <p className="intro-footer">Built for accountability. Designed for transparency.</p>
      </div>
      <div className="shape shape-one" aria-hidden="true" /><div className="shape shape-two" aria-hidden="true" /><div className="shape shape-three" aria-hidden="true" />
    </section>

    <section className="login-stage" aria-label="Sign in">
      <div className="login-card">
        <div className="card-heading">
          <span className="secure-badge"><ShieldCheck size={15} /> Secure workspace</span>
          <h2>Welcome back</h2>
          <p>Sign in to access your workspace.</p>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="identifier">Email or Employee ID</label><div className="input-wrap"><UserRound size={17} /><input id="identifier" type="text" autoComplete="username" value={identifier} onChange={event => setIdentifier(event.target.value)} placeholder="Enter your email or employee ID" required /></div></div>
          <div className="field"><label htmlFor="password">Password</label><div className="input-wrap"><LockKeyhole size={17} /><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(current => !current)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
          <fieldset className="role-field"><legend>Sign in as</legend><div className="role-grid">{roles.map(({ name, icon: Icon }) => <button key={name} type="button" className={`role-option ${role === name ? "active" : ""}`} aria-pressed={role === name} onClick={() => setRole(name)}><Icon size={16} /><span>{name}</span></button>)}</div></fieldset>
          <div className="form-row"><label className="remember"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /><span className="fake-check"><Check size={12} /></span>Remember me</label><button type="button" className="forgot-link" onClick={async () => { if (!identifier.includes("@")) { setMessage("Enter your work email first so we can send a recovery link."); return; } if (!isSupabaseConfigured) { setMessage("Password recovery is unavailable until Supabase is configured."); return; } const { error } = await createClient().auth.resetPasswordForEmail(identifier.trim().toLowerCase(), { redirectTo: `${window.location.origin}/auth/callback?next=/login` }); setMessage(error ? error.message : "If that email is registered, a password recovery link has been sent."); }}>Forgot password?</button></div>
          {message && <p className="login-message" role="status">{message}</p>}
          <button type="submit" className="sign-in-button" disabled={busy}>{busy ? "Checking access..." : "Sign In"}<ArrowRight size={17} /></button>
        </form>
        <div className="access-note"><span className="access-line" />Authorized access only<span className="access-line" /></div>
        <p className="version-label">Rework-Aware / Workspace Access</p>
      </div>
    </section>
  </main>;
}
