"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardCheck, FileClock, ListChecks, ShieldCheck, UsersRound } from "lucide-react";
import { StoreProvider, useStore } from "@/lib/store";
import { SignOutButton } from "@/components/sign-out-button";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function ManagerPortalPage() {
  return <StoreProvider><ManagerPortal /></StoreProvider>;
}

function ManagerPortal() {
  const { data, ready, error, clearError, update } = useStore();
  const [decision, setDecision] = useState<{ bugId: string; value: "Approved" | "Exempt" } | null>(null);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("all");
  const pendingTime = data.time.filter(entry => entry.status === "Pending");
  const reviewQueue = data.bugs.filter(bug => bug.review === "Pending" && !["Rejected", "Closed"].includes(bug.status));
  const visibleBugs = useMemo(() => filter === "all" ? data.bugs : data.bugs.filter(bug => bug.severity === filter), [data.bugs, filter]);
  if (!ready) return <main className="role-content"><p>Loading manager workspace...</p></main>;

  async function submitDecision(event: React.FormEvent) {
    event.preventDefault();
    if (!decision || reason.trim().length < 15) return;
    const ok = await update("bugs", decision.bugId, { review: decision.value, reason: reason.trim() });
    if (ok) { setDecision(null); setReason(""); }
  }

  return <main className="role-portal">
    <aside className="role-sidebar"><div className="role-brand"><span><ShieldCheck size={18} /></span><strong>Rework-Aware</strong></div><div className="role-identity"><span>MG</span><div><strong>Manager</strong><small>Connected workspace</small></div></div><nav aria-label="Manager navigation"><a href="#overview"><BarChart3 size={17} />Overview</a><a href="#projects"><ListChecks size={17} />Modules and tasks</a><a href="#decisions"><ClipboardCheck size={17} />Deduction review</a><a href="#quality"><UsersRound size={17} />Quality metrics</a><a href="#audit"><FileClock size={17} />Audit trail</a></nav><div className="role-sidebar-bottom">{isSupabaseConfigured ? <SignOutButton /> : <a href="/login">Change portal</a>}</div></aside>
    <section className="role-main"><header className="role-header"><div><span className="role-header-muted">Workspace / </span><strong>Manager</strong></div><span className="role-demo-label">{data.projects.length ? "CONNECTED DATA" : "NO DATA"}</span></header><div className="role-content">
      <div className="role-introduction" id="overview"><span>MANAGER WORKSPACE</span><h1>Make quality decisions with context.</h1><p>Review delivery quality, corrective work, and deduction eligibility without finalising payroll from this workspace.</p></div>
      {error && <div className="role-notice"><div><strong>Action could not be completed</strong><p>{error}</p></div><button className="secondary-button" onClick={clearError}>Dismiss</button></div>}
      <div className="role-metrics"><article><div className="role-metric-icon"><ListChecks size={17} /></div><div><small>Projects under management</small><strong>{data.projects.length}</strong><em>Authorised workspace scope</em></div></article><article><div className="role-metric-icon"><AlertTriangle size={17} /></div><div><small>Reopened tasks</small><strong>{data.tasks.filter(task => task.status === "Reopened" || task.status === "Under fix").length}</strong><em>Need delivery attention</em></div></article><article><div className="role-metric-icon"><FileClock size={17} /></div><div><small>Corrective hours pending</small><strong>{pendingTime.filter(entry => entry.category === "Corrective").reduce((sum, entry) => sum + entry.hours, 0).toFixed(1)}h</strong><em>Not yet deductible</em></div></article></div>
      <div className="role-lower"><section className="role-panel" id="projects"><div className="role-panel-heading"><span>PROJECT OVERSIGHT</span><h2>Delivery review</h2></div>{data.projects.map(project => <div className="role-activity-row" key={project.id}><span><ListChecks size={13} /></span><p><strong>{project.name}</strong><small>{project.progress}% complete · due {project.due || "Not set"} · {data.tasks.filter(task => task.projectId === project.id).length} tasks</small></p></div>)}{!data.projects.length && <p>No projects in the authorised scope.</p>}</section>
      <section className="role-panel" id="decisions"><div className="role-panel-heading"><span>DECISION QUEUE</span><h2>Defect responsibility</h2></div>{reviewQueue.map(bug => <div className="role-activity-row" key={bug.id}><span><AlertTriangle size={13} /></span><p><strong>{bug.title}</strong><small>{bug.id} · {bug.severity} · {bug.owner} · {data.time.filter(entry => entry.bugId === bug.id).reduce((sum, entry) => sum + entry.hours, 0).toFixed(1)}h</small></p><button className="small-button" onClick={() => setDecision({ bugId: bug.id, value: "Approved" })}>Review</button></div>)}{!reviewQueue.length && <p>No defects are awaiting a decision.</p>}</section></div>
      <section className="role-panel" id="quality" style={{ marginTop: 16 }}><div className="role-panel-heading"><span>QUALITY METRICS</span><h2>Rework signals</h2></div><div className="role-metrics"><article><div><small>Reopen rate</small><strong>{data.tasks.length ? ((data.tasks.filter(task => task.status === "Reopened" || task.status === "Under fix").length / data.tasks.length) * 100).toFixed(1) : "0.0"}%</strong><em>{data.tasks.length} tasks sampled</em></div></article><article><div><small>Average corrective hours</small><strong>{data.bugs.length ? (data.time.filter(entry => entry.category === "Corrective").reduce((sum, entry) => sum + entry.hours, 0) / Math.max(1, data.bugs.filter(bug => bug.review !== "Exempt").length)).toFixed(1) : "0.0"}h</strong><em>Across reviewed defects</em></div></article><article><div><small>Approved decisions</small><strong>{data.bugs.filter(bug => bug.review === "Approved").length}</strong><em>Exempt: {data.bugs.filter(bug => bug.review === "Exempt").length}</em></div></article></div><label className="manager-filter">Severity filter<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All severities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>{visibleBugs.map(bug => <div className="role-activity-row" key={bug.id}><span><CheckCircle2 size={13} /></span><p><strong>{bug.id} · {bug.title}</strong><small>{bug.status} · decision {bug.review}</small></p></div>)}</section>
      <section className="role-panel" id="audit" style={{ marginTop: 16 }}><div className="role-panel-heading"><span>AUDIT TRAIL</span><h2>Recent decisions and changes</h2></div>{data.audits.slice(0, 8).map(audit => <div className="role-activity-row" key={audit.id}><span><FileClock size={13} /></span><p><strong>{audit.action}</strong><small>{audit.subject} · {audit.actor} · {audit.date}</small></p></div>)}{!data.audits.length && <p>No audit events are available.</p>}</section>
    </div></section>
    {decision && <div className="employee-modal-backdrop" role="presentation"><form className="employee-modal" onSubmit={submitDecision}><h2>Record defect decision</h2><p>Choose whether {decision.bugId} can move to Finance review. This does not finalise payroll.</p><label>Decision<select value={decision.value} onChange={event => setDecision({ ...decision, value: event.target.value as "Approved" | "Exempt" })}><option value="Approved">Eligible for Finance review</option><option value="Exempt">Exempt from deduction</option></select></label><label>Justification<textarea minLength={15} required value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain the evidence and decision." /></label><div className="employee-modal-actions"><button type="button" className="secondary-button" onClick={() => setDecision(null)}>Cancel</button><button className="primary-button">Save decision</button></div></form></div>}
  </main>;
}
