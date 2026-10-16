import { z } from "zod";
import { requireWorkspace, rpcError } from "@/lib/api/context";
import { errorResponse, privateJson } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const context = await requireWorkspace(request);
    const { proposalId, response, reason } = z.object({ proposalId: z.uuid(), response: z.enum(["acknowledged", "disputed"]), reason: z.string().max(5000).optional() }).parse(await request.json());
    const { error } = await context.supabase.rpc("respond_to_proposal", { p_org: context.organisationId, p_proposal: proposalId, p_response: response, p_reason: reason ?? null });
    rpcError(error);
    return privateJson({ ok: true });
  } catch (error) { return errorResponse(error); }
}
