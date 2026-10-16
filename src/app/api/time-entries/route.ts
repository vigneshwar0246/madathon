import { z } from "zod";
import { requireRole, requireWorkspace, rpcError } from "@/lib/api/context";
import { ApiError, errorResponse, privateJson } from "@/lib/api/errors";
import { date, id } from "@/lib/api/input";

const createSchema = z.object({ taskId: id, bugId: id.optional(), employeeId: id, date, hours: z.number().positive().max(24), description: z.string().trim().min(5).max(5000) });
const reviewSchema = z.object({ id, status: z.enum(["Approved", "Rejected"]) });
export async function POST(request: Request) {
  try {
    const context = await requireWorkspace(request);
    const input = createSchema.parse(await request.json());
    if (input.employeeId !== context.employeeId) throw new ApiError("You can only log your own time", 403);
    const { data, error } = await context.supabase.rpc("log_work_time", { p_org: context.organisationId, p_task: input.taskId, p_bug: input.bugId ?? null, p_date: input.date, p_hours: input.hours, p_description: input.description });
    rpcError(error);
    return privateJson({ id: data }, 201);
  } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try {
    const context = await requireWorkspace(request);
    requireRole(context.role, ["owner", "manager", "team_lead"]);
    const input = reviewSchema.parse(await request.json());
    const { error } = await context.supabase.rpc("review_time_entry", { p_org: context.organisationId, p_entry: input.id, p_decision: input.status.toLowerCase() });
    rpcError(error);
    return privateJson({ ok: true });
  } catch (error) { return errorResponse(error); }
}
