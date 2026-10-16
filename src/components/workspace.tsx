"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Pulse, Bell, Bug, ChartBar, CheckCircle, ClockCounterClockwise, Clock, Gear, House, List, MagnifyingGlass, Money, SquaresFour, Users, X, FileText, ShieldCheck, Receipt, SignOut } from "@phosphor-icons/react";
import { StoreProvider, useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Dashboard } from "@/features/dashboard";
import { Projects } from "@/features/projects";
import { Tasks } from "@/features/tasks";
import { Bugs } from "@/features/bugs";
import { TimeLogs } from "@/features/time-logs";
import { Approvals } from "@/features/approvals";
import { Payroll } from "@/features/payroll";
import { Analytics } from "@/features/analytics";
import { People } from "@/features/people";
import { Records } from "@/features/records";
import { Badge } from "./ui";

const primary = [
  { href: "/dashboard", label: "Overview", icon: House },
  { href: "/projects", label: "Projects & modules", icon: SquaresFour },
  { href: "/tasks", label: "Task assignments", icon: CheckCircle },
  { href: "/bugs", label: "Bug & rework", icon: Bug },
  { href: "/time-logs", label: "Time tracking", icon: Clock },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck }
];
const management = [
  { href: "/payroll", label: "Payroll", icon: Money },
  { href: "/payslips", label: "Payslips", icon: Receipt },
  { href: "/analytics", label: "Analytics", icon: ChartBar },
  { href: "/employees", label: "People", icon: Users },
  { href: "/audit-logs", label: "Audit trail", icon: ClockCounterClockwise }
];

function Shell({ section }: { section: string }) {
  const path = usePathname();
  const { data, ready, mode, identity, error, clearError, refresh } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const unread = data.notices.filter(item => !item.read).length;
  const canManage = mode === "demo" || ["owner", "manager", "team_lead"].includes(identity?.role ?? "");
  const canPayroll = mode === "demo" || ["owner", "payroll_admin"].includes(identity?.role ?? "");
  const nav = (items: typeof primary) => items.filter(item => item.href !== "/approvals" || canManage).filter(item => item.href !== "/payroll" || canPayroll).filter(item => item.href !== "/audit-logs" || canManage || canPayroll).map(item => <Link key={item.href} href={item.href} className={`nav-link ${path === item.href ? "active" : ""}`} onClick={() => setMobileOpen(false)}><item.icon size={19} weight={path === item.href ? "fill" : "regular"} /><span>{item.label}</span>{item.href === "/approvals" && <span className="nav-count">{data.time.filter(row => row.status === "Pending").length + data.bugs.filter(row => row.review === "Pending").length}</span>}</Link>);
  const page = {
    dashboard: <Dashboard />, projects: <Projects />, tasks: <Tasks />, bugs: <Bugs />, "time-logs": <TimeLogs />, approvals: <Approvals />, payroll: <Payroll />, payslips: <Payroll payslips />, analytics: <Analytics />, employees: <People />, organisation: <People organisation />, "audit-logs": <Records />, notifications: <Records notifications />, settings: <Records settings />
  }[section] ?? <Dashboard />;
  const searchResults = [
    ...data.projects.map(item => ({ title: item.name, detail: item.id, href: "/projects" })),
    ...data.tasks.map(item => ({ title: item.title, detail: item.id, href: "/tasks" })),
    ...data.bugs.map(item => ({ title: item.title, detail: item.id, href: "/bugs" }))
  ].filter(item => `${item.title} ${item.detail}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
  if (mode === "live" && !ready) return <div className="workspace-loading"><span className="brand-symbol"><Pulse size={25} /></span><strong>Loading your workspace...</strong></div>;
  if (mode === "live" && error && !identity) return <div className="workspace-loading"><strong>Could not load your workspace</strong><p>{error}</p><button className="button button-primary" onClick={() => { clearError(); refresh().catch(() => {}); }}>Try again</button></div>;
  return <div className="app-frame">
    <div className="ambient ambient-a" /><div className="ambient ambient-b" /><div className="ambient ambient-c" />
    {mobileOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar glass ${mobileOpen ? "sidebar-open" : ""}`}>
      <Link href="/dashboard" className="brand"><span className="brand-symbol"><Pulse size={25} weight="bold" /></span><span>vetra<span className="brand-period">.</span><small>WORK INTELLIGENCE</small></span></Link>
      <div className="workspace-switch"><span className="workspace-logo">{identity?.organisationName[0] ?? "N"}</span><span><strong>{identity?.organisationName ?? "Northstar Digital"}</strong><small>{mode === "demo" ? "Enterprise workspace" : `${identity?.role.replaceAll("_", " ")} workspace`}</small></span><span className="switch-chevron">⌄</span></div>
      <div className="nav-group-label">WORKSPACE</div><nav>{nav(primary)}</nav>
      <div className="nav-group-label management-label">MANAGEMENT</div><nav>{nav(management)}</nav>
      <div className="sidebar-bottom">{mode === "demo" && <div className="demo-note"><span className="demo-pulse" /><strong>Frontend preview</strong><p>Explore the product with sample data. Changes stay in this browser.</p></div>}<Link href="/settings" className={`nav-link ${path === "/settings" ? "active" : ""}`}><Gear size={19} /> <span>Settings</span></Link><div className="profile"><span className="profile-avatar">{mode === "demo" ? "PN" : data.employees.find(person => person.id === identity?.employeeId)?.initials ?? "ME"}</span><span><strong>{mode === "demo" ? "Priya Nair" : data.employees.find(person => person.id === identity?.employeeId)?.name ?? "My account"}</strong><small>{mode === "demo" ? "Workspace manager" : identity?.role.replaceAll("_", " ")}</small></span>{mode === "live" ? <button className="icon-button" aria-label="Sign out" onClick={async () => { await createClient().auth.signOut(); window.location.assign("/login"); }}><SignOut size={18} /></button> : <span className="profile-ellipsis">···</span>}</div></div>
    </aside>
    <div className="main-shell"><header className="topbar glass"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><List size={22} /></button><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{[...primary, ...management].find(item => item.href === path)?.label ?? section.replaceAll("-", " ")}</strong></div><div className="topbar-actions"><button className="search-trigger" onClick={() => setSearchOpen(true)}><MagnifyingGlass size={17} /><span>Search anything...</span><kbd>⌘ K</kbd></button><span className="topbar-divider" /><button className="icon-button notification-button" onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="Notifications"><Bell size={20} />{unread > 0 && <i />}</button><span className="top-avatar">PN</span></div></header>
      {notificationsOpen && <div className="notification-popover glass"><div className="popover-head"><strong>Notifications</strong><Link href="/notifications" onClick={() => setNotificationsOpen(false)}>View all</Link></div>{data.notices.slice(0, 3).map(item => <div className="notice-mini" key={item.id}><span className={item.read ? "notice-dot read" : "notice-dot"} /><div><strong>{item.title}</strong><p>{item.body}</p><small>{item.date}</small></div></div>)}</div>}
      <main className="content">{error && <div className="global-error" role="alert"><span>{error}</span><button onClick={clearError}>Dismiss</button></div>}{page}<footer className="site-footer"><span>{mode === "demo" ? "Vetra workspace preview" : identity?.organisationName}</span><span>Designed for clearer work, quality and pay decisions.</span></footer></main>
    </div>
    {searchOpen && <div className="search-overlay" onMouseDown={() => setSearchOpen(false)}><div className="search-dialog glass" onMouseDown={e => e.stopPropagation()}><div className="search-input-row"><MagnifyingGlass size={20} /><input autoFocus placeholder="Search projects, tasks or bugs" value={query} onChange={e => setQuery(e.target.value)} /><button className="icon-button" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={20} /></button></div><div className="search-list">{searchResults.length ? searchResults.map(item => <Link key={item.detail} href={item.href} onClick={() => setSearchOpen(false)}><span><FileText size={18} />{item.title}</span><Badge>{item.detail}</Badge></Link>) : <p>No matching items found.</p>}</div><div className="search-footer">Results from this demo workspace</div></div></div>}
  </div>;
}

export function Workspace({ section }: { section: string }) { return <StoreProvider><Shell section={section} /></StoreProvider>; }
