"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { AppData, WorkspaceIdentity } from "./types";

export type EmployeeTaskStatus = "Assigned" | "In progress" | "Submitted" | "Completed" | "Reopened" | "Under fix";
export type WorkType = "Normal Development" | "Corrective Maintenance";
export type ReviewState = "Pending" | "Approved" | "Exempt";
export type EmployeeTask = { id: string; title: string; project: string; module: string; committedDate: string; completedDate?: string; status: EmployeeTaskStatus; priority: "High" | "Medium" | "Low"; description: string; defectId?: string };
export type EmployeeDefect = { id: string; title: string; taskId: string; severity: "Critical" | "High" | "Medium" | "Low"; status: "Pending review" | "Under fix" | "Resolved"; decision: ReviewState; decisionReason?: string; reported: string; description: string; correctiveHours: number; history: { label: string; date: string }[] };
export type EmployeeWorkLog = { id: string; taskId: string; defectId?: string; date: string; hours: number; type: WorkType; description: string; review: ReviewState };
export type EmployeeNotification = { id: string; title: string; body: string; category: "Task" | "Payroll" | "Rework"; date: string; read: boolean; taskId?: string; defectId?: string };
export type EmployeeProfile = { name: string; employeeId: string; email: string; department: string; title: string; phone: string };
export type EmployeeActivity = { id: string; label: string; detail: string; date: string };

type EmployeeState = { tasks: EmployeeTask[]; defects: EmployeeDefect[]; logs: EmployeeWorkLog[]; notifications: EmployeeNotification[]; profile: EmployeeProfile; activities: EmployeeActivity[]; clarificationRequests: { id: string; defectId: string; message: string; date: string; status: "Submitted" }[] };

const initialState: EmployeeState = {
  tasks: [
    { id: "TSK-284", title: "Implement payment reconciliation", project: "Atlas Platform", module: "Billing Engine", committedDate: "2026-10-21", completedDate: "2026-09-28", status: "Reopened", priority: "High", description: "Reconcile invoice payments and handle partial settlement states.", defectId: "BUG-042" },
    { id: "TSK-307", title: "Appointment reminders", project: "Meridian Mobile", module: "Notifications", committedDate: "2026-10-23", status: "In progress", priority: "Medium", description: "Build scheduled appointment reminder flows." },
    { id: "TSK-326", title: "Data ingestion validation", project: "Signal Analytics", module: "Data Pipeline", committedDate: "2026-10-30", status: "Assigned", priority: "High", description: "Validate incoming event schema and rejection handling." },
    { id: "TSK-276", title: "User onboarding screens", project: "Meridian Mobile", module: "Onboarding", committedDate: "2026-10-12", completedDate: "2026-10-11", status: "Completed", priority: "Low", description: "Complete first run onboarding screens.", defectId: "BUG-036" }
  ],
  defects: [
    { id: "BUG-042", title: "Duplicate payment on retry", taskId: "TSK-284", severity: "Critical", status: "Under fix", decision: "Pending", reported: "2026-10-14", description: "A timed out retry can create a second payment record.", correctiveHours: 6, history: [{ label: "Linked to original delivery", date: "Oct 14, 2026" }, { label: "Verified by Team Lead", date: "Oct 15, 2026" }, { label: "Under fix", date: "Oct 16, 2026" }] },
    { id: "BUG-036", title: "Client requested welcome copy", taskId: "TSK-276", severity: "Low", status: "Resolved", decision: "Exempt", decisionReason: "New client requirement, not a delivery defect.", reported: "2026-10-09", description: "Client requested revised text after delivery.", correctiveHours: 0, history: [{ label: "Reported after completion", date: "Oct 9, 2026" }, { label: "Exempted by Manager", date: "Oct 14, 2026" }] }
  ],
  logs: [
    { id: "LOG-183", taskId: "TSK-284", defectId: "BUG-042", date: "2026-10-16", hours: 2, type: "Corrective Maintenance", description: "Reproduced duplicate payment path", review: "Pending" },
    { id: "LOG-184", taskId: "TSK-307", date: "2026-10-15", hours: 6, type: "Normal Development", description: "Built reminder scheduling view", review: "Approved" }
  ],
  notifications: [
    { id: "NOT-01", title: "Corrective hours await review", body: "2.0 hours were logged against BUG-042.", category: "Payroll", date: "Today, 9:42 AM", read: false, defectId: "BUG-042" },
    { id: "NOT-02", title: "Task reopened", body: "Payment reconciliation needs corrective work.", category: "Rework", date: "Yesterday, 4:18 PM", read: false, taskId: "TSK-284" },
    { id: "NOT-03", title: "New work marked exempt", body: "BUG-036 was excluded from payroll consideration.", category: "Payroll", date: "Oct 14, 2026", read: true, defectId: "BUG-036" }
  ],
  profile: { name: "Anika Rao", employeeId: "EMP-01", email: "anika@northstar.example", department: "Engineering", title: "Engineering Lead", phone: "+91 98765 43210" },
  activities: [{ id: "ACT-01", label: "Corrective work logged", detail: "2.0h against BUG-042", date: "Today, 9:42 AM" }, { id: "ACT-02", label: "Task reopened", detail: "Implement payment reconciliation", date: "Yesterday, 4:18 PM" }, { id: "ACT-03", label: "Payroll decision recorded", detail: "BUG-036 marked exempt", date: "Oct 14, 2026" }],
  clarificationRequests: []
};

type EmployeeStore = EmployeeState & { ready: boolean; error: string; updateTask: (id: string, status: EmployeeTaskStatus) => Promise<boolean>; addLog: (log: Omit<EmployeeWorkLog, "id" | "review">) => Promise<{ ok: boolean; error?: string }>; deleteLog: (id: string) => void; markRead: (id: string) => void; markAllRead: () => void; addClarification: (defectId: string, message: string) => void; saveProfile: (profile: EmployeeProfile) => void; reset: () => void };
const Context = createContext<EmployeeStore | null>(null);
const KEY = "rework-aware-employee-v1";
const today = () => new Date().toISOString().slice(0, 10);

function fromRemote(data: AppData, identity: WorkspaceIdentity): EmployeeState {
  const employee = data.employees.find(item => item.id === identity.employeeId) ?? data.employees[0];
  const tasks = data.tasks.filter(item => !item.assigneeId || item.assigneeId === identity.employeeId).map(item => ({ id: item.id, title: item.title, project: data.projects.find(project => project.id === item.projectId)?.name ?? item.projectId, module: item.module, committedDate: item.due, completedDate: item.completed, status: item.status as EmployeeTaskStatus, priority: item.priority, description: item.description, defectId: data.bugs.find(bug => bug.taskId === item.id)?.id }));
  const defects = data.bugs.filter(item => !item.ownerId || item.ownerId === identity.employeeId).map(item => ({ id: item.id, title: item.title, taskId: item.taskId, severity: item.severity, status: item.status === "Reported" ? "Pending review" : item.status === "Verified" ? "Under fix" : item.status as EmployeeDefect["status"], decision: item.review, decisionReason: item.reason, reported: item.reported, description: item.description, correctiveHours: data.time.filter(log => log.bugId === item.id && log.category === "Corrective").reduce((sum, log) => sum + log.hours, 0), history: [{ label: `Defect ${item.status.toLowerCase()}`, date: item.reported }] }));
  const logs = data.time.filter(item => !item.employeeId || item.employeeId === identity.employeeId).map(item => ({ id: item.id, taskId: item.taskId, defectId: item.bugId, date: item.date, hours: item.hours, type: (item.category === "Corrective" ? "Corrective Maintenance" : "Normal Development") as WorkType, description: item.description, review: item.status === "Approved" ? "Approved" as const : "Pending" as const }));
  return { tasks, defects, logs, notifications: data.notices.map(item => ({ id: item.id, title: item.title, body: item.body, category: "Payroll", date: item.date, read: item.read })), profile: { name: employee?.name ?? "Employee", employeeId: employee?.id ?? identity.employeeId, email: employee?.email ?? "", department: employee?.department ?? "General", title: employee?.role ?? "Employee", phone: "" }, activities: data.audits.slice(0, 8).map(item => ({ id: item.id, label: item.action, detail: item.subject, date: item.date })), clarificationRequests: [] };
}

export function EmployeeStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EmployeeState>(initialState);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isSupabaseConfigured) {
      fetch("/api/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load employee workspace");
        if (body.needsOnboarding) { window.location.assign("/onboarding"); return; }
        setState(fromRemote(body.data as AppData, body.identity as WorkspaceIdentity));
        setReady(true);
      }).catch(caught => { setError(caught instanceof Error ? caught.message : "Could not load employee workspace"); setReady(true); });
      return;
    }
    try { const saved = localStorage.getItem(KEY); if (saved) setState(JSON.parse(saved) as EmployeeState); } catch { /* A corrupt preview is safely replaced by the fixture. */ }
    setReady(true);
  }, []);
  const commit = useCallback((change: (current: EmployeeState) => EmployeeState) => setState(current => { const next = change(current); localStorage.setItem(KEY, JSON.stringify(next)); return next; }), []);
  const updateTask = async (id: string, status: EmployeeTaskStatus) => {
    const task = state.tasks.find(item => item.id === id);
    if (!task || !({ Assigned: ["In progress"], "In progress": ["Submitted"], Submitted: [], Reopened: ["Under fix"], "Under fix": ["Submitted"], Completed: [] }[task.status] as string[]).includes(status)) return false;
    if (isSupabaseConfigured) {
      const response = await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
      if (!response.ok) return false;
      window.location.reload();
      return true;
    }
    commit(current => ({ ...current, tasks: current.tasks.map(item => item.id === id ? { ...item, status, completedDate: status === "Completed" ? today() : item.completedDate } : item), activities: [{ id: `ACT-${Date.now()}`, label: `Task marked ${status.toLowerCase()}`, detail: task.title, date: "Just now" }, ...current.activities], notifications: [{ id: `NOT-${Date.now()}`, title: `Task ${status.toLowerCase()}`, body: `${task.title} is now ${status.toLowerCase()}.`, category: "Task", date: "Just now", read: false, taskId: id }, ...current.notifications] }));
    return true;
  };
  const addLog = async (log: Omit<EmployeeWorkLog, "id" | "review">) => {
    if (!log.taskId || !log.date || !log.description.trim() || log.hours <= 0 || log.hours > 12) return { ok: false, error: "Enter a task, date, description, and between 0 and 12 hours." };
    if (log.type === "Corrective Maintenance" && (!log.defectId || !state.defects.some(defect => defect.id === log.defectId && (defect.status !== "Resolved" || defect.decision === "Approved")))) return { ok: false, error: "Corrective maintenance must link to an active reopened task or defect." };
    if (isSupabaseConfigured) {
      const response = await fetch("/api/time-entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: log.taskId, bugId: log.defectId, employeeId: state.profile.employeeId, date: log.date, hours: log.hours, category: log.type === "Corrective Maintenance" ? "Corrective" : "New work", description: log.description }) });
      if (!response.ok) return { ok: false, error: "The work log could not be saved. Check your task and defect access." };
      window.location.reload();
      return { ok: true };
    }
    commit(current => ({ ...current, logs: [{ ...log, id: `LOG-${Date.now()}`, review: "Pending" }, ...current.logs], activities: [{ id: `ACT-${Date.now()}`, label: "Work hours logged", detail: `${log.hours}h of ${log.type}`, date: "Just now" }, ...current.activities], notifications: [{ id: `NOT-${Date.now()}`, title: "Work log submitted", body: `${log.hours} hours are pending review.`, category: "Task", date: "Just now", read: false, taskId: log.taskId }, ...current.notifications] }));
    return { ok: true };
  };
  const value = useMemo<EmployeeStore>(() => ({ ...state, ready, error, updateTask, addLog, deleteLog: id => commit(current => ({ ...current, logs: current.logs.filter(log => log.id !== id) })), markRead: id => commit(current => ({ ...current, notifications: current.notifications.map(item => item.id === id ? { ...item, read: true } : item) })), markAllRead: () => commit(current => ({ ...current, notifications: current.notifications.map(item => ({ ...item, read: true })) })), addClarification: (defectId, message) => commit(current => ({ ...current, clarificationRequests: [{ id: `CLR-${Date.now()}`, defectId, message, date: "Just now", status: "Submitted" }, ...current.clarificationRequests], activities: [{ id: `ACT-${Date.now()}`, label: "Clarification requested", detail: defectId, date: "Just now" }, ...current.activities] })), saveProfile: profile => commit(current => ({ ...current, profile })), reset: () => { localStorage.removeItem(KEY); setState(initialState); } }), [state, ready, error, commit]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useEmployeeStore() { const value = useContext(Context); if (!value) throw new Error("EmployeeStoreProvider is missing"); return value; }
