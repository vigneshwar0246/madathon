import { z } from "zod";
import { requireRole, requireWorkspace, rpcError } from "@/lib/api/context";
import { ApiError, errorResponse, privateJson } from "@/lib/api/errors";
import { date } from "@/lib/api/input";

const schema = z.object({ name: z.string().trim().min(2).max(120), client: z.string().trim().max(120), description: z.string().trim().max(5000), ownerId: z.string().min(4).max(64), due: date, modules: z.array(z.string().trim().min(2).max(120)).min(1).max(30) });
export async function POST(request: Request) {
  try {
    const context = await requireWorkspace(request);
    requireRole(context.role, ["owner", "manager", "team_lead"]);
    const input = schema.parse(await request.json());
    const { data: owner } = await context.supabase.from("employees").select("id").eq("organisation_id", context.organisationId).eq("id", input.ownerId).maybeSingle();
    if (!owner) throw new ApiError("Project owner not found");
    const { data, error } = await context.supabase.rpc("create_project", { p_org: context.organisationId, p_name: input.name, p_client: input.client, p_description: input.description, p_owner: owner.id, p_due: input.due, p_modules: input.modules });
    rpcError(error);
    return privateJson({ id: data }, 201);
  } catch (error) { return errorResponse(error); }
}
