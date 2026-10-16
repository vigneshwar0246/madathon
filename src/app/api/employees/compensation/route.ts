import { z } from "zod";
import { requireRole, requireWorkspace, rpcError } from "@/lib/api/context";
import { errorResponse, privateJson } from "@/lib/api/errors";
import { id } from "@/lib/api/input";

export async function PATCH(request: Request) {
  try {
    const context = await requireWorkspace(request);
    requireRole(context.role, ["owner", "payroll_admin"]);
    const { employeeId, hourlyRate, grossMonthly } = z.object({ employeeId: id, hourlyRate: z.number().min(0).max(1000000), grossMonthly: z.number().min(0).max(100000000) }).parse(await request.json());
    const { error } = await context.supabase.rpc("set_compensation", { p_org: context.organisationId, p_employee: employeeId, p_hourly: hourlyRate, p_gross: grossMonthly });
    rpcError(error);
    return privateJson({ ok: true });
  } catch (error) { return errorResponse(error); }
}
