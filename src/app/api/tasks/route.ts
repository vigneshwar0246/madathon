import { z } from "zod";
import { requireRole, requireWorkspace, rpcError } from "@/lib/api/context";
import { ApiError, errorResponse, privateJson } from "@/lib/api/errors";
import { date, id, text, toDatabaseState } from "@/lib/api/input";

const createSchema = z.object({ title: text, projectId: id, module: z.string().min(2).max(120), assigneeId: id, due: date, priority: z.enum(["Low", "Medium", "High"]), description: z.string().max(5000) });
const updateSchema = z.object({ id, status: z.enum(["Assigned", "In progress", "Submitted", "Completed", "Reopened", "Under fix", "Closed"]), reason: z.string().max(1000).optional() });
export async function POST(request: Request) {
  try {
    const context = await requireWorkspace(request);
    requireRole(context.role, ["owner", "manager", "team_lead"]);
    const input = createSchema.parse(await request.json());
    const [module, person] = await Promise.all([
      context.supabase.from("modules").select("id").eq("organisation_id", context.organisationId).eq("project_id", input.projectId).eq("name", input.module).maybeSingle(),
      context.supabase.from("employees").select("id").eq("organisation_id", context.organisationId).eq("id", input.assigneeId).maybeSingle()
    ]);
    if (!module.data || !person.data) throw new ApiError("Module or assignee not found");
    const { data, error } = await context.supabase.rpc("assign_task", { p_org: context.organisationId, p_project: input.projectId, p_module: module.data.id, p_title: input.title, p_description: input.description, p_assignee: person.data.id, p_due: input.due, p_priority: input.priority.toLowerCase() });
    rpcError(error);
    return privateJson({ id: data }, 201);
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    const context = await requireWorkspace(request);
    const input = updateSchema.parse(await request.json());
    const { error } = await context.supabase.rpc("change_task_status", { p_org: context.organisationId, p_task: input.id, p_status: toDatabaseState(input.status), p_reason: input.reason ?? null });
    rpcError(error);
    return privateJson({ ok: true });
  } catch (error) { return errorResponse(error); }
}
