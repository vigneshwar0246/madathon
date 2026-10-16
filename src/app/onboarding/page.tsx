"use client";

import { useState } from "react";
import { ArrowRight, Buildings, Pulse } from "@phosphor-icons/react";

export default function OnboardingPage() {
  const [name, setName] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/organisations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not create workspace");
      window.location.assign("/dashboard");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create workspace"); setBusy(false); }
  }
  return <main className="auth-page"><div className="auth-glow" /><section className="onboarding-card glass"><span className="brand-symbol"><Pulse size={26} weight="bold" /></span><span className="eyebrow">SET UP YOUR WORKSPACE</span><h1>Give your team a place to work clearly.</h1><p>Your organisation is private. You can add employees and projects after setup.</p><form onSubmit={submit}><label>Organisation name<input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Your company name" /></label><div className="jurisdiction-note"><Buildings size={19} /><span>Payroll jurisdiction: India. Payroll finalisation remains on hold until policy review.</span></div>{error && <div className="auth-error" role="alert">{error}</div>}<button className="button button-primary button-wide" disabled={busy}>{busy ? "Creating workspace..." : "Create workspace"}<ArrowRight size={17} /></button></form></section></main>;
}
