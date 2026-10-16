"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, ArrowRight, Bell, BriefcaseBusiness, CheckCircle2, ChevronRight, CircleDollarSign, ClipboardCheck, FileClock, FileText, FolderKanban, LayoutDashboard, ListChecks, LogOut, Menu, ShieldCheck, UserRound, UsersRound, X } from "lucide-react";

export type PortalRole = "employee" | "lead" | "manager" | "finance";

type PortalConfig = {
  label: string;
  eyebrow: string;
  title: string;
  summary: string;
  initials: string;
  navigation: { label: string; href: string; icon: typeof LayoutDashboard }[];
  notice: { label: string; title: string; body: string };
  metrics: { label: string; value: string; detail: string; icon: typeof Activity }[];
  actions: { label: string; body: string; href: string; icon: typeof Activity }[];
};

const shared = {
  employee: {
    label: "Employee", eyebrow: "EMPLOYEE WORKSPACE", title: "Keep your delivery clear.", summary: "See committed work, record your hours, and understand every rework decision connected to your tasks.", initials: "AN",
    navigation: [{ label: "My tasks", href: "#tasks", icon: ListChecks }, { label: "Task history", href: "#history", icon: FileClock }, { label: "Reopened work", href: "#reopened", icon: Activity }, { label: "Timesheet", href: "#timesheet", icon: ClipboardCheck }, { label: "Notifications", href: "#notifications", icon: Bell }, { label: "My payslip", href: "#payslip", icon: FileText }],
    notice: { label: "APRIL PAYROLL NOTICE", title: "6 corrective hours are under review.", body: "Your current sample estimate is Rs 3,000. Review the linked work before payroll decisions are made." },
    metrics: [{ label: "Open tasks", value: "08", detail: "2 due this week", icon: ListChecks }, { label: "Corrective hours", value: "06.0h", detail: "Awaiting review", icon: FileClock }, { label: "Reopened work", value: "02", detail: "1 under fix", icon: Activity }],
    actions: [{ label: "Review my tasks", body: "Check status, dates, and linked defects.", href: "#tasks", icon: ListChecks }, { label: "Log hours", body: "Separate new work from corrective maintenance.", href: "#timesheet", icon: ClipboardCheck }, { label: "View payslip", body: "See the sample payroll proposal.", href: "#payslip", icon: FileText }]
  },
  lead: {
    label: "Team Lead", eyebrow: "TEAM LEAD WORKSPACE", title: "Keep the team moving.", summary: "Coordinate delivery, raise linked defects, and verify that corrective work is ready for review.", initials: "TR",
    navigation: [{ label: "Team tasks", href: "#tasks", icon: ListChecks }, { label: "Raise bug", href: "#bug", icon: Activity }, { label: "Hours approval", href: "#approvals", icon: ClipboardCheck }, { label: "Fix verification", href: "#verification", icon: ShieldCheck }],
    notice: { label: "REVIEW QUEUE", title: "4 fix-hour entries need your attention.", body: "Approve work that is linked to a verified issue. Keep responsibility decisions separate from fix verification." },
    metrics: [{ label: "Team tasks", value: "24", detail: "18 on track", icon: UsersRound }, { label: "Open defects", value: "07", detail: "2 high severity", icon: Activity }, { label: "Pending reviews", value: "04", detail: "Fix hours", icon: ClipboardCheck }],
    actions: [{ label: "Review team tasks", body: "See progress across your active modules.", href: "#tasks", icon: ListChecks }, { label: "Raise a bug", body: "Link a defect to the original completed task.", href: "#bug", icon: Activity }, { label: "Verify fixes", body: "Confirm resolved work before approval.", href: "#verification", icon: ShieldCheck }]
  },
  manager: {
    label: "Manager", eyebrow: "MANAGER WORKSPACE", title: "Make quality decisions with context.", summary: "Review rework responsibility, proposed deductions, quality metrics, and the evidence behind every decision.", initials: "MR",
    navigation: [{ label: "Modules and tasks", href: "#tasks", icon: FolderKanban }, { label: "Hours approval", href: "#approvals", icon: ClipboardCheck }, { label: "Deduction review", href: "#deductions", icon: CircleDollarSign }, { label: "Audit trail", href: "#audit", icon: FileClock }, { label: "Quality metrics", href: "#metrics", icon: Activity }],
    notice: { label: "DECISION QUEUE", title: "3 deduction proposals are ready for review.", body: "Approve a proposal only when the original delivery caused the rework. Waivers require a reason." },
    metrics: [{ label: "Reopen rate", value: "8.4%", detail: "Down 1.2% this month", icon: Activity }, { label: "Average fix time", value: "4.6h", detail: "Across active modules", icon: FileClock }, { label: "Pending proposals", value: "03", detail: "Need a decision", icon: CircleDollarSign }],
    actions: [{ label: "Review deductions", body: "Inspect hours, amount, bug, and responsibility.", href: "#deductions", icon: CircleDollarSign }, { label: "Open quality metrics", body: "Compare reopen rate and fix time by module.", href: "#metrics", icon: Activity }, { label: "Read audit trail", body: "See who approved or waived and why.", href: "#audit", icon: FileClock }]
  },
  finance: {
    label: "Finance Admin", eyebrow: "FINANCE WORKSPACE", title: "Close the month with confidence.", summary: "Review payroll proposals, deductions, waivers, and reports before any payroll process is finalised.", initials: "FA",
    navigation: [{ label: "Monthly summary", href: "#summary", icon: LayoutDashboard }, { label: "Deduction engine", href: "#deductions", icon: CircleDollarSign }, { label: "Payslips", href: "#payslips", icon: FileText }, { label: "Reports", href: "#reports", icon: Activity }, { label: "Audit trail", href: "#audit", icon: FileClock }],
    notice: { label: "APRIL PAYROLL", title: "Payroll review is ready to prepare.", body: "This workspace shows proposals and summaries. Final payroll execution is not available in this demo." },
    metrics: [{ label: "Corrective hours", value: "42.5h", detail: "Across 9 employees", icon: FileClock }, { label: "Proposed amount", value: "Rs 21,250", detail: "Before waivers", icon: CircleDollarSign }, { label: "Waived amount", value: "Rs 4,500", detail: "Manager approved", icon: ShieldCheck }],
    actions: [{ label: "Open monthly summary", body: "Review hours, deductions, and waivers.", href: "#summary", icon: LayoutDashboard }, { label: "Review payslips", body: "Inspect the sample employee breakdown.", href: "#payslips", icon: FileText }, { label: "Build a report", body: "Explore rework time and payroll savings.", href: "#reports", icon: Activity }]
  }
} satisfies Record<PortalRole, PortalConfig>;

export function RolePortal({ role }: { role: PortalRole }) {
  const config = shared[role];
  const [menuOpen, setMenuOpen] = useState(false);
  return <main className="role-portal">
    <aside className={`role-sidebar ${menuOpen ? "open" : ""}`}><div className="role-brand"><span><BriefcaseBusiness size={18} /></span><strong>Rework-Aware</strong></div><div className="role-identity"><span>{config.initials}</span><div><strong>{config.label}</strong><small>Sample workspace</small></div></div><nav aria-label={`${config.label} navigation`}>{config.navigation.map(item => <Link href={item.href} key={item.label} onClick={() => setMenuOpen(false)}><item.icon size={17} /><span>{item.label}</span><ChevronRight size={14} /></Link>)}</nav><div className="role-sidebar-bottom"><span className="role-secure"><ShieldCheck size={15} /> Secure workspace</span><Link href="/login"><LogOut size={16} /> Change portal</Link></div></aside>
    {menuOpen && <button className="role-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <section className="role-main"><header className="role-header"><button className="role-menu-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button><div><span className="role-header-muted">Workspace /</span><strong>{config.label}</strong></div><div className="role-header-actions"><span className="role-demo-label">DEMO DATA</span><button className="role-bell" aria-label="Notifications"><Bell size={18} /><i /></button><span className="role-avatar">{config.initials}</span></div></header><div className="role-content"><div className="role-introduction"><span>{config.eyebrow}</span><h1>{config.title}</h1><p>{config.summary}</p></div><section className="role-notice"><div><span>{config.notice.label}</span><h2>{config.notice.title}</h2><p>{config.notice.body}</p></div><ShieldCheck size={28} /></section><div className="role-metrics">{config.metrics.map(metric => <article key={metric.label}><span className="role-metric-icon"><metric.icon size={17} /></span><div><small>{metric.label}</small><strong>{metric.value}</strong><em>{metric.detail}</em></div></article>)}</div><section className="role-lower"><article className="role-panel role-actions"><div className="role-panel-heading"><span>QUICK ACCESS</span><h2>Start with what matters.</h2></div>{config.actions.map(action => <Link href={action.href} key={action.label}><span className="role-action-icon"><action.icon size={17} /></span><span><strong>{action.label}</strong><small>{action.body}</small></span><ArrowRight size={16} /></Link>)}</article><article className="role-panel role-activity"><div className="role-panel-heading"><span>RECENT ACTIVITY</span><h2>Latest signals.</h2></div>{["Corrective work linked to original task", "Fix hours submitted for review", "Quality review updated this month"].map((item, index) => <div className="role-activity-row" key={item}><span>{index + 1}</span><p><strong>{item}</strong><small>{index === 0 ? "Today, 10:42" : index === 1 ? "Yesterday, 16:10" : "Oct 14, 2026"}</small></p><CheckCircle2 size={16} /></div>)}</article></section></div></section>
  </main>;
}
