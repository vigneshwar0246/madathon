import { z } from "zod";
import { requireRole, requireWorkspace, rpcError } from "@backend/api/context";
import { errorResponse, privateJson } from "@backend/api/errors";

export async function POST(request: Request) {
  try {
    const context = await requireWorkspace(request);
    requireRole(context.role, ["owner", "payroll_admin"]);
    const { periodId } = z.object({ periodId: z.uuid() }).parse(await request.json());
    const { error } = await context.supabase.rpc("finalise_payroll", { p_org: context.organisationId, p_period: periodId });
    rpcError(error);
    return privateJson({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
