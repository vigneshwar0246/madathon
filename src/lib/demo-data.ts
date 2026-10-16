import type { AppData } from "./types";

export const initialData: AppData = {
  projects: [
    { id: "PRJ-104", name: "Atlas Platform", client: "Northstar Digital", description: "Enterprise operations platform and customer portal", progress: 78, due: "2026-11-14", owner: "Anika Rao", modules: ["Authentication", "Billing Engine", "Client Portal", "Reporting"] },
    { id: "PRJ-105", name: "Meridian Mobile", client: "Meridian Health", description: "Mobile experience and API integration", progress: 54, due: "2026-12-02", owner: "Marcus Chen", modules: ["Onboarding", "Appointments", "Notifications"] },
    { id: "PRJ-106", name: "Signal Analytics", client: "Signal Labs", description: "Decision intelligence dashboard", progress: 32, due: "2026-12-18", owner: "Priya Nair", modules: ["Data Pipeline", "Insights", "Exports"] }
  ],
  tasks: [
    { id: "TSK-284", title: "Implement payment reconciliation", module: "Billing Engine", projectId: "PRJ-104", assignee: "Anika Rao", due: "2026-10-21", completed: "2026-09-28", status: "Reopened", priority: "High", description: "Reconcile invoice payments and handle partial settlement states." },
    { id: "TSK-291", title: "Customer session management", module: "Authentication", projectId: "PRJ-104", assignee: "Marcus Chen", due: "2026-10-19", completed: "2026-09-22", status: "Under fix", priority: "High", description: "Manage secure sessions across the client portal." },
    { id: "TSK-307", title: "Appointment reminders", module: "Notifications", projectId: "PRJ-105", assignee: "Sofia Patel", due: "2026-10-23", status: "In progress", priority: "Medium", description: "Build scheduled appointment reminder flows." },
    { id: "TSK-318", title: "Insights export pipeline", module: "Exports", projectId: "PRJ-106", assignee: "Noah Williams", due: "2026-10-26", status: "Submitted", priority: "Medium", description: "Generate structured report exports for customers." },
    { id: "TSK-276", title: "User onboarding screens", module: "Onboarding", projectId: "PRJ-105", assignee: "Sofia Patel", due: "2026-10-12", completed: "2026-10-11", status: "Completed", priority: "Low", description: "Complete first run onboarding screens." },
    { id: "TSK-326", title: "Data ingestion validation", module: "Data Pipeline", projectId: "PRJ-106", assignee: "Priya Nair", due: "2026-10-30", status: "Assigned", priority: "High", description: "Validate incoming event schema and rejection handling." }
  ],
  bugs: [
    { id: "BUG-042", title: "Duplicate payment on retry", taskId: "TSK-284", severity: "Critical", status: "Verified", reported: "2026-10-14", description: "A timed out retry can create a second payment record.", owner: "Anika Rao", review: "Pending" },
    { id: "BUG-039", title: "Session expires unexpectedly", taskId: "TSK-291", severity: "High", status: "Under fix", reported: "2026-10-11", description: "Customer sessions expire before the configured timeout.", owner: "Marcus Chen", review: "Approved" },
    { id: "BUG-036", title: "Client requested welcome copy", taskId: "TSK-276", severity: "Low", status: "Resolved", reported: "2026-10-09", description: "Client requested revised text after delivery.", owner: "Sofia Patel", review: "Exempt", reason: "New client requirement, not a delivery defect." }
  ],
  time: [
    { id: "LOG-182", taskId: "TSK-291", bugId: "BUG-039", employee: "Marcus Chen", date: "2026-10-15", hours: 3.5, category: "Corrective", description: "Investigated session refresh edge case", status: "Approved" },
    { id: "LOG-183", taskId: "TSK-284", bugId: "BUG-042", employee: "Anika Rao", date: "2026-10-16", hours: 2, category: "Corrective", description: "Reproduced duplicate payment path", status: "Pending" },
    { id: "LOG-184", taskId: "TSK-307", employee: "Sofia Patel", date: "2026-10-15", hours: 6, category: "New work", description: "Built reminder scheduling view", status: "Approved" },
    { id: "LOG-185", taskId: "TSK-318", employee: "Noah Williams", date: "2026-10-14", hours: 5, category: "New work", description: "Completed export transformations", status: "Approved" }
  ],
  employees: [
    { id: "EMP-01", name: "Anika Rao", initials: "AR", role: "Engineering Lead", department: "Engineering", rate: 42, email: "anika@northstar.example", color: "peach" },
    { id: "EMP-02", name: "Marcus Chen", initials: "MC", role: "Senior Engineer", department: "Engineering", rate: 38, email: "marcus@northstar.example", color: "blue" },
    { id: "EMP-03", name: "Sofia Patel", initials: "SP", role: "Product Designer", department: "Design", rate: 34, email: "sofia@northstar.example", color: "violet" },
    { id: "EMP-04", name: "Noah Williams", initials: "NW", role: "Data Engineer", department: "Engineering", rate: 36, email: "noah@northstar.example", color: "green" },
    { id: "EMP-05", name: "Priya Nair", initials: "PN", role: "Project Manager", department: "Operations", rate: 40, email: "priya@northstar.example", color: "pink" }
  ],
  notices: [
    { id: "NOT-01", title: "Corrective hours await review", body: "2.0 hours were logged against BUG-042 by Anika Rao.", date: "Today, 9:42 AM", read: false },
    { id: "NOT-02", title: "Defect verified", body: "BUG-042 has been verified and linked to the original delivery.", date: "Yesterday, 4:18 PM", read: false },
    { id: "NOT-03", title: "New work marked exempt", body: "BUG-036 was excluded from the payroll proposal with a recorded reason.", date: "Oct 14, 2026", read: true }
  ],
  audits: [
    { id: "AUD-01", actor: "Priya Nair", action: "Marked defect exempt", subject: "BUG-036", date: "Oct 14, 2026 · 3:24 PM" },
    { id: "AUD-02", actor: "Priya Nair", action: "Approved corrective hours", subject: "LOG-182", date: "Oct 15, 2026 · 11:08 AM" },
    { id: "AUD-03", actor: "System", action: "Reopened original task", subject: "TSK-284", date: "Oct 14, 2026 · 9:15 AM" }
  ]
};
