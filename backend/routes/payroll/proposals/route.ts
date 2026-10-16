import { z } from "zod";
import { requireRole, requireWorkspace, rpcError } from "@backend/api/context";
import { errorResponse, privateJson } from "@backend/api/errors";

export async function POST(request: Request) {
  try {
    const context = await requireWorkspace(request);
    requireRole(context.role, ["owner", "payroll_admin"]);
    const input = z.object({
      proposalId: z.uuid(),
      decision: z.enum(["approved", "cancelled", "held"]),
      reason: z.string().trim().max(5000).default("")
    }).parse(await request.json());
    const { error } = await context.supabase.rpc("decide_payroll_proposal", {
      p_org: context.organisationId,
      p_proposal: input.proposalId,
      p_decision: input.decision,
      p_reason: input.reason
    });
    rpcError(error);
    return privateJson({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
