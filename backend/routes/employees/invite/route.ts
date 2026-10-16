import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireRole, requireWorkspace, rpcError } from "@backend/api/context";
import { errorResponse, privateJson } from "@backend/api/errors";

const schema = z.object({ email: z.email(), fullName: z.string().trim().min(2).max(120), role: z.enum(["manager", "team_lead", "employee", "payroll_admin"]), title: z.string().trim().min(2).max(120), department: z.string().trim().min(2).max(120) });
export async function POST(request: Request) {
  try {
    const context = await requireWorkspace(request);
    requireRole(context.role, ["owner", "manager"]);
    const input = schema.parse(await request.json());
    const { data, error } = await context.supabase.rpc("create_employee_invitation", { p_org: context.organisationId, p_email: input.email, p_name: input.fullName, p_role: input.role, p_title: input.title, p_department: input.department });
    rpcError(error);
    const secret = process.env.SUPABASE_SECRET_KEY;
    let delivery = "manual_signup";
    if (secret) {
      const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, { auth: { autoRefreshToken: false, persistSession: false } });
      const origin = new URL(request.url).origin;
      const invited = await admin.auth.admin.inviteUserByEmail(input.email, { redirectTo: `${origin}/auth/callback?next=/dashboard` });
      delivery = invited.error ? "manual_signup" : "email_sent";
    }
    return privateJson({ invitationId: data, delivery }, 201);
  } catch (error) { return errorResponse(error); }
}
