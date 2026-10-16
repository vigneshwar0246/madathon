"use client";

import { useStore } from "@/lib/store";
import { Bell, ClockCounterClockwise, Gear, ShieldCheck, Trash } from "@phosphor-icons/react";
import { Badge, Empty, PageHeading, SectionHeading } from "@/components/ui";

export function Records({ notifications = false, settings = false }: { notifications?: boolean; settings?: boolean }) {
  const { data, reset, mode, identity, refresh } = useStore();
  const live = mode === "live";
  async function markRead(id: string) {
    if (!identity) return;
    const response = await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (response.ok) await refresh();
  }
  if (settings) return <>
    <PageHeading eyebrow="WORKSPACE / SETTINGS" title="Settings" description={live ? "Your workspace and account details." : "Preview workspace preferences and local demo data."} />
    <section className="panel glass settings-panel">
      <SectionHeading title={live ? "Workspace" : "Preview environment"} caption={live ? "Authenticated workspace access" : "This preview runs in your browser"} />
      <div className="setting-row"><span className="setting-icon"><Gear size={21} /></span><div><strong>{live ? identity?.organisationName : "Workspace mode"}</strong><p>{live ? `Your role: ${identity?.role.replaceAll("_", " ")}` : "Browser saved sample data"}</p></div><Badge tone="active">{live ? "Live" : "Demo"}</Badge></div>
      <div className="setting-row"><span className="setting-icon"><ShieldCheck size={21} /></span><div><strong>Access & security</strong><p>{live ? "Workspace roles and database policies control access to records." : "Sign in and tenant isolation are available after Supabase setup."}</p></div><Badge>{live ? "Enabled" : "Preview"}</Badge></div>
      {!live && <div className="setting-row"><span className="setting-icon"><Trash size={21} /></span><div><strong>Reset local preview</strong><p>Restore the original sample projects, tasks and reviews</p></div><button className="button button-secondary" onClick={() => { if (window.confirm("Reset this browser's preview data?")) reset(); }}>Reset demo data</button></div>}
    </section>
  </>;
  if (notifications) return <>
    <PageHeading eyebrow="WORKSPACE / UPDATES" title="Notifications" description="Recent changes that need your attention." />
    <section className="panel glass"><SectionHeading title="Activity inbox" caption={live ? "Private notices sent to your account" : "Sample notifications for the preview workspace"} />
      <div className="notice-list">{data.notices.length ? data.notices.map(item => <article key={item.id} className="notice-item"><span className="notice-icon"><Bell size={19} /></span><div><strong>{item.title}</strong><p>{item.body}</p><small>{item.date}</small></div>{!item.read && (live ? <button className="button button-secondary" onClick={() => markRead(item.id)}>Mark read</button> : <i className="notice-dot" />)}</article>) : <Empty title="No notifications" description="Account updates will appear here." />}</div>
    </section>
  </>;
  return <>
    <PageHeading eyebrow="GOVERNANCE / HISTORY" title="Audit trail" description={live ? "Recorded workspace actions and decisions." : "A readable record of work transitions and reviews in this preview."} />
    <section className="panel glass"><SectionHeading title="Recent events" caption={live ? "Actions recorded in the workspace" : "New decisions appear as you use the demo"} />
      <div className="audit-list">{data.audits.length ? data.audits.map(item => <div className="audit-row" key={item.id}><span className="audit-icon"><ClockCounterClockwise size={19} /></span><div><strong>{item.action}</strong><small>{item.actor} · {item.subject}</small></div><time>{item.date}</time></div>) : <Empty title="No events yet" description="Actions will be listed here." />}</div>
    </section>
  </>;
}
