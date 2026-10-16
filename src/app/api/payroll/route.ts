import { z } from "zod";
import { requireRole, requireWorkspace, rpcError } from "@/lib/api/context";
import { ApiError, errorResponse, privateJson } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const context = await requireWorkspace(request);
    const { data: periods, error: periodError } = await context.supabase.from("payroll_periods").select("id,work_month,payroll_month,status").eq("organisation_id", context.organisationId).order("work_month", { ascending: false }).limit(24);
    if (periodError && context.role !== "employee") throw new ApiError(periodError.message, 500);
    const { data: proposals, error } = await context.supabase.from("deduction_proposals").select("id,period_id,time_entry_id,employee_id,hours,hourly_rate,proposed_amount,status").eq("organisation_id", context.organisationId).limit(1000);
    if (error) throw new ApiError(error.message, 500);
    const { data: compensation, error: compensationError } = await context.supabase.from("employee_compensation").select("employee_id,hourly_rate,gross_monthly,currency").eq("organisation_id", context.organisationId).limit(1000);
    if (compensationError) throw new ApiError(compensationError.message, 500);
    return privateJson({ periods: periods ?? [], proposals: proposals ?? [], compensation: compensation ?? [] });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    const context = await requireWorkspace(request);
    requireRole(context.role, ["owner", "payroll_admin"]);
    const { workMonth } = z.object({ workMonth: z.iso.date() }).parse(await request.json());
    const { data, error } = await context.supabase.rpc("create_payroll_draft", { p_org: context.organisationId, p_work_month: workMonth });
    rpcError(error);
    return privateJson({ periodId: data }, 201);
  } catch (error) { return errorResponse(error); }
}
