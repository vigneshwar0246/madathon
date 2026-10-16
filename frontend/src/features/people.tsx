"use client";

import { useState } from "react";
import { Buildings, Envelope, Plus, Users } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import type { Employee } from "@/lib/types";
import { Avatar, Badge, Field, Modal, PageHeading, SectionHeading } from "@/components/ui";

export function People({ organisation = false }: { organisation?: boolean }) {
  const { data, mode, identity, refresh } = useStore();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [payPerson, setPayPerson] = useState<Employee | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState({ fullName: "", email: "", role: "employee", title: "", department: "" });
  const [pay, setPay] = useState({ hourlyRate: "", grossMonthly: "" });
  const canInvite = mode === "live" && ["owner", "manager"].includes(identity?.role ?? "");
  const canPay = mode === "live" && ["owner", "payroll_admin"].includes(identity?.role ?? "");
  async function callApi(path: string, method: string, payload: object) {
    setBusy(true); setError("");
    try {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json", "x-organisation-id": identity?.organisationId ?? "" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Action failed");
      await refresh();
      return body;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Action failed"); return null; }
    finally { setBusy(false); }
  }
  async function sendInvite(event: React.FormEvent) {
    event.preventDefault();
    const result = await callApi("/api/employees/invite", "POST", invite);
    if (result) { setInviteOpen(false); setInvite({ fullName: "", email: "", role: "employee", title: "", department: "" }); setMessage(result.delivery === "email_sent" ? "Invitation email sent." : "Invitation saved. Ask the employee to sign up with that email address."); }
  }
  async function savePay(event: React.FormEvent) {
    event.preventDefault();
    if (!payPerson) return;
    const result = await callApi("/api/employees/compensation", "PATCH", { employeeId: payPerson.id, hourlyRate: Number(pay.hourlyRate), grossMonthly: Number(pay.grossMonthly) });
    if (result) { setPayPerson(null); setMessage("Compensation updated and recorded in the audit trail."); }
  }
  if (organisation) return <><PageHeading eyebrow="WORKSPACE / ORGANISATION" title={identity?.organisationName ?? "Northstar Digital"} description="A single view of the organisation behind every project and decision." /><div className="organisation-card glass"><span className="organisation-mark">{identity?.organisationName[0] ?? "N"}</span><div><span className="eyebrow">ENTERPRISE WORKSPACE</span><h2>{identity?.organisationName ?? "Northstar Digital"}</h2><p>One connected space for delivery, quality review and payroll clarity.</p><div><Badge tone="active">{mode === "live" ? "Active" : "Preview"}</Badge><span>{data.employees.length} members</span><span>{data.projects.length} projects</span></div></div></div><section className="panel glass"><SectionHeading title="Workspace structure" caption="Departments represented in this workspace" /><div className="department-grid">{[...new Set(data.employees.map(item => item.department))].map(department => <div key={department}><Buildings size={25} /><strong>{department}</strong><span>{data.employees.filter(item => item.department === department).length} people</span></div>)}</div></section></>;
  return <><PageHeading eyebrow="WORKSPACE / PEOPLE" title="People directory" description="Find the original owner and current collaborators behind every delivery." action={canInvite ? <button className="button button-primary" onClick={() => setInviteOpen(true)}><Plus size={17} /> Invite employee</button> : undefined} />{message && <div className="info-line">{message}</div>}{error && <div className="global-error" role="alert">{error}</div>}<div className="metric-strip glass"><span><strong>{data.employees.length}</strong> team members</span><span><strong>{new Set(data.employees.map(item => item.department)).size}</strong> departments</span><span><strong>{data.projects.length}</strong> projects</span></div><div className="people-grid">{data.employees.map(person => <article className="person-card glass" key={person.id}><Avatar initials={person.initials} color={person.color} /><h2>{person.name}</h2><span>{person.role}</span><Badge>{person.department}</Badge><div><Envelope size={17} /><a href={`mailto:${person.email}`}>{person.email}</a></div>{canPay && <button className="small-action approve" onClick={() => { setPayPerson(person); setPay({ hourlyRate: String(person.rate), grossMonthly: "0" }); }}>Set compensation</button>}</article>)}</div>{mode === "demo" && <div className="info-line"><Users size={18} /> Employee invitations and real role permissions are available after Supabase is configured.</div>}
    {inviteOpen && <Modal title="Invite an employee" subtitle="Invite a teammate to this organisation." onClose={() => setInviteOpen(false)}><form className="form-grid" onSubmit={sendInvite}><Field label="Full name"><input required minLength={2} value={invite.fullName} onChange={e => setInvite({ ...invite, fullName: e.target.value })} /></Field><Field label="Work email"><input required type="email" value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })} /></Field><div className="form-columns"><Field label="Role"><select value={invite.role} onChange={e => setInvite({ ...invite, role: e.target.value })}><option value="employee">Employee</option><option value="team_lead">Team lead</option>{identity?.role === "owner" && <><option value="manager">Manager</option><option value="payroll_admin">Payroll admin</option></>}</select></Field><Field label="Department"><input required value={invite.department} onChange={e => setInvite({ ...invite, department: e.target.value })} /></Field></div><Field label="Job title"><input required value={invite.title} onChange={e => setInvite({ ...invite, title: e.target.value })} /></Field>{error && <div className="auth-error" role="alert">{error}</div>}<div className="form-actions"><button className="button button-ghost" type="button" onClick={() => setInviteOpen(false)}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Inviting..." : "Send invitation"}</button></div></form></Modal>}
    {payPerson && <Modal title={`Compensation · ${payPerson.name}`} subtitle="Only owners and payroll admins can make this change." onClose={() => setPayPerson(null)}><form className="form-grid" onSubmit={savePay}><div className="linked-box">Rates are stored separately from the people directory and access is restricted.</div><Field label="Hourly rate (₹)"><input required type="number" min="0" step="0.01" value={pay.hourlyRate} onChange={e => setPay({ ...pay, hourlyRate: e.target.value })} /></Field><Field label="Gross monthly salary (₹)"><input required type="number" min="0" step="0.01" value={pay.grossMonthly} onChange={e => setPay({ ...pay, grossMonthly: e.target.value })} /></Field>{error && <div className="auth-error" role="alert">{error}</div>}<div className="form-actions"><button className="button button-ghost" type="button" onClick={() => setPayPerson(null)}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Saving..." : "Save compensation"}</button></div></form></Modal>}
  </>;
}
