import { createClient as createAdminClient } from "@supabase/supabase-js";
import { errorResponse, privateJson } from "@backend/api/errors";

const demoAccounts = [
  { email: "employee.demo@demo.rework-aware.test", password: "Demo.Employee.2026!", fullName: "Demo Employee", title: "Product Designer", department: "Design", role: "employee" },
  { email: "lead.demo@demo.rework-aware.test", password: "Demo.TeamLead.2026!", fullName: "Demo Team Lead", title: "Team Lead", department: "Engineering", role: "team_lead" },
  { email: "manager.demo@demo.rework-aware.test", password: "Demo.Manager.2026!", fullName: "Demo Manager", title: "Delivery Manager", department: "Operations", role: "manager" },
  { email: "finance.demo@demo.rework-aware.test", password: "Demo.Finance.2026!", fullName: "Demo Finance Admin", title: "Finance Administrator", department: "Finance", role: "payroll_admin" }
] as const;

function assertResult<T>(result: { data: T | null; error: { message: string } | null }, action: string): NonNullable<T> {
  if (result.error) throw new Error(`${action}: ${result.error.message}`);
  if (result.data === null) throw new Error(`${action}: no data returned`);
  return result.data as NonNullable<T>;
}

function assertValue<T>(value: T | null, action: string): T {
  if (value === null) throw new Error(`${action}: no data returned`);
  return value;
}

export async function POST() {
  try {
    if (process.env.NODE_ENV === "production" || process.env.DEMO_ACCOUNTS_ENABLED !== "true") {
      return privateJson({ error: "Demo account provisioning is disabled." }, 404);
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!url || !secret) return privateJson({ error: "Set the server-only Supabase secret key before provisioning demo accounts." }, 503);

    const admin = createAdminClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
    const organisations = assertResult(await admin.from("organisations").select("id").eq("name", "Rework-Aware Demo Workspace").limit(1), "Finding demo workspace");
    let organisationId = organisations[0]?.id;
    if (!organisationId) {
      const organisation = assertResult(await admin.from("organisations").insert({ name: "Rework-Aware Demo Workspace" }).select("id").single(), "Creating demo workspace");
      organisationId = (organisation as { id: string }).id;
    }

    for (const account of demoAccounts) {
      const userResult = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
      if (userResult.error) throw new Error(`Looking up ${account.email}: ${userResult.error.message}`);
      const existing = userResult.data.users.find(user => user.email?.toLowerCase() === account.email);
      let user;
      if (existing) {
        user = assertValue((await admin.auth.admin.updateUserById(existing.id, { password: account.password, email_confirm: true, user_metadata: { full_name: account.fullName } })).data.user, `Updating ${account.email}`);
      } else {
        user = assertValue((await admin.auth.admin.createUser({ email: account.email, password: account.password, email_confirm: true, user_metadata: { full_name: account.fullName } })).data.user, `Creating ${account.email}`);
      }
      const employee = assertResult(await admin.from("employees").upsert({ organisation_id: organisationId, auth_user_id: user.id, full_name: account.fullName, email: account.email, title: account.title, department: account.department, active: true }, { onConflict: "organisation_id,email" }).select("id").single(), `Creating profile for ${account.email}`);
      const employeeId = (employee as { id: string }).id;
      const membership = await admin.from("memberships").upsert({ organisation_id: organisationId, user_id: user.id, employee_id: employeeId, role: account.role }, { onConflict: "organisation_id,user_id" });
      if (membership.error) throw new Error(`Creating membership for ${account.email}: ${membership.error.message}`);
    }

    return privateJson({ accounts: demoAccounts, organisation: "Rework-Aware Demo Workspace" });
  } catch (error) {
    return errorResponse(error);
  }
}
