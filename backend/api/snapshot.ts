import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppData, WorkspaceIdentity } from "@shared/types";
import { ApiError } from "./errors";

type Row = Record<string, any>;
const labels: Record<string, string> = { assigned: "Assigned", in_progress: "In progress", submitted: "Submitted", completed: "Completed", reopened: "Reopened", under_fix: "Under fix", closed: "Closed", reported: "Reported", verified: "Verified", resolved: "Resolved", pending: "Pending", approved: "Approved", rejected: "Rejected", corrective: "Corrective", new_work: "New work", eligible: "Approved", exempt: "Exempt", low: "Low", medium: "Medium", high: "High", critical: "Critical" };
const label = (value: string) => labels[value] ?? value;
const date = (value: string | null) => value ? value.slice(0, 10) : undefined;
const initials = (name: string) => name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();

export async function loadSnapshot(supabase: SupabaseClient, identity: WorkspaceIdentity): Promise<AppData> {
  const org = identity.organisationId;
  const tables = ["projects", "modules", "module_events", "tasks", "task_events", "bugs", "time_entries", "rework_reviews", "employees", "employee_compensation", "notifications", "audit_events"] as const;
  const orderKey: Record<typeof tables[number], string> = { projects: "id", modules: "id", module_events: "id", tasks: "id", task_events: "id", bugs: "id", time_entries: "id", rework_reviews: "bug_id", employees: "id", employee_compensation: "employee_id", notifications: "id", audit_events: "id" };
  const results = await Promise.all(tables.map(async table => {
    const rows: Row[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from(table).select("*").eq("organisation_id", org).order(orderKey[table]).range(offset, offset + 499);
      if (error) throw new ApiError(`Could not load ${table}: ${error.message}`, 500);
      rows.push(...(data ?? []));
      if (!data || data.length < 500) return rows;
    }
  }));
  const [projects, modules, moduleEvents, tasks, taskEvents, bugs, time, reviews, employees, compensation, notifications, audits] = results;
  const employee = (id: string) => employees.find(row => row.id === id);
  const module = (id: string) => modules.find(row => row.id === id);
  const review = (id: string) => reviews.find(row => row.bug_id === id);
  return {
    projects: projects.map(row => ({ id: row.id, name: row.name, client: row.client_name, description: row.description, progress: (() => { const own = tasks.filter(task => task.project_id === row.id); return own.length ? Math.round(own.filter(task => ["completed", "closed"].includes(task.status)).length / own.length * 100) : 0; })(), due: date(row.committed_date) ?? "", owner: employee(row.owner_employee_id)?.full_name ?? "", ownerId: row.owner_employee_id, modules: modules.filter(item => item.project_id === row.id).map(item => item.name) })),
    modules: modules.map(row => ({ id: row.id, projectId: row.project_id, name: row.name, due: date(row.committed_date) ?? "", completed: date(row.completed_at), status: label(row.status) as NonNullable<AppData["modules"]>[number]["status"], history: moduleEvents.filter(event => event.module_id === row.id).sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).map(event => ({ status: label(event.to_status), date: new Date(event.occurred_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }), actor: employee(employees.find(person => person.auth_user_id === event.actor_user_id)?.id)?.full_name ?? "System" })) })),
    tasks: tasks.map(row => ({ id: row.id, title: row.title, module: module(row.module_id)?.name ?? "Unknown", projectId: row.project_id, assignee: employee(row.assignee_employee_id)?.full_name ?? "Unknown", assigneeId: row.assignee_employee_id, due: date(row.committed_date) ?? "", completed: date(row.completed_at), reopenedCount: taskEvents.filter(event => event.task_id === row.id && event.to_status === "reopened").length, status: label(row.status) as AppData["tasks"][number]["status"], priority: label(row.priority) as AppData["tasks"][number]["priority"], description: row.description })),
    bugs: bugs.map(row => ({ id: row.id, title: row.title, taskId: row.task_id, severity: label(row.severity) as AppData["bugs"][number]["severity"], status: label(row.status) as AppData["bugs"][number]["status"], reported: date(row.reported_at) ?? "", resolved: date(row.resolved_at), description: row.description, owner: employee(row.original_employee_id)?.full_name ?? "Unknown", ownerId: row.original_employee_id, review: review(row.id) ? label(review(row.id)?.decision ?? "pending") as AppData["bugs"][number]["review"] : "Pending", reason: review(row.id)?.reason })),
    time: time.map(row => ({ id: row.id, taskId: row.task_id, bugId: row.bug_id ?? undefined, employee: employee(row.employee_id)?.full_name ?? "Unknown", employeeId: row.employee_id, date: date(row.work_date) ?? "", hours: Number(row.hours), category: label(row.category) as AppData["time"][number]["category"], description: row.description, status: label(row.review_status) as AppData["time"][number]["status"] })),
    employees: employees.map((row, index) => ({ id: row.id, name: row.full_name, initials: initials(row.full_name), role: row.title, department: row.department, rate: Number(compensation.find(item => item.employee_id === row.id)?.hourly_rate ?? 0), email: row.email, color: ["peach", "blue", "violet", "green", "pink"][index % 5] })),
    notices: notifications.map(row => ({ id: row.id, title: row.title, body: row.body, date: new Date(row.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }), read: Boolean(row.read_at) })),
    audits: audits.sort((a, b) => b.created_at.localeCompare(a.created_at)).map(row => ({ id: row.id, actor: employee(employees.find(item => item.auth_user_id === row.actor_user_id)?.id)?.full_name ?? "System", action: row.action.replaceAll(".", " ").replaceAll("_", " "), subject: row.subject_id, date: new Date(row.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) }))
  };
}
