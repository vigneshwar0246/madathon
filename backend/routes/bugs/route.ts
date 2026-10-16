import { z } from "zod";
import { requireWorkspace, rpcError } from "@backend/api/context";
import { errorResponse, privateJson } from "@backend/api/errors";
import { date, id, text, toDatabaseState } from "@backend/api/input";

const createSchema = z.object({ title: text, taskId: id, severity: z.enum(["Low", "Medium", "High", "Critical"]), description: z.string().trim().min(10).max(5000), reported: date });
const updateSchema = z.object({ id, status: z.enum(["Reported", "Verified", "Under fix", "Resolved", "Closed", "Rejected"]) });
export async function POST(request: Request) {
  try {
    const context = await requireWorkspace(request);
    const input = createSchema.parse(await request.json());
    const { data, error } = await context.supabase.rpc("report_bug", { p_org: context.organisationId, p_task: input.taskId, p_title: input.title, p_description: input.description, p_severity: input.severity.toLowerCase(), p_found: input.reported });
    rpcError(error);
    return privateJson({ id: data }, 201);
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    const context = await requireWorkspace(request);
    const input = updateSchema.parse(await request.json());
    const { error } = await context.supabase.rpc("change_bug_status", { p_org: context.organisationId, p_bug: input.id, p_status: toDatabaseState(input.status) });
    rpcError(error);
    return privateJson({ ok: true });
  } catch (error) { return errorResponse(error); }
}
