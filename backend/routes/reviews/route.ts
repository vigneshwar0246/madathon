import { z } from "zod";
import { requireRole, requireWorkspace, rpcError } from "@backend/api/context";
import { errorResponse, privateJson } from "@backend/api/errors";
import { id } from "@backend/api/input";

const schema = z.object({ bugId: id, decision: z.enum(["Approved", "Exempt"]), reason: z.string().trim().min(15).max(5000) });
export async function POST(request: Request) {
  try {
    const context = await requireWorkspace(request);
    requireRole(context.role, ["owner", "manager", "team_lead"]);
    const input = schema.parse(await request.json());
    const { error } = await context.supabase.rpc("review_rework", { p_org: context.organisationId, p_bug: input.bugId, p_decision: input.decision === "Approved" ? "eligible" : "exempt", p_reason: input.reason });
    rpcError(error);
    return privateJson({ ok: true });
  } catch (error) { return errorResponse(error); }
}
