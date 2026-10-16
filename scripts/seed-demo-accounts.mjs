import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY before running demo:accounts."
  );
}

const demoAccounts = [
  {
    email: "employee.demo@demo.rework-aware.test",
    password: "Demo.Employee.2026!",
    fullName: "Demo Employee",
    title: "Product Designer",
    department: "Design",
    role: "employee"
  },
  {
    email: "lead.demo@demo.rework-aware.test",
    password: "Demo.TeamLead.2026!",
    fullName: "Demo Team Lead",
    title: "Team Lead",
    department: "Engineering",
    role: "team_lead"
  },
  {
    email: "manager.demo@demo.rework-aware.test",
    password: "Demo.Manager.2026!",
    fullName: "Demo Manager",
    title: "Delivery Manager",
    department: "Operations",
    role: "manager"
  },
  {
    email: "finance.demo@demo.rework-aware.test",
    password: "Demo.Finance.2026!",
    fullName: "Demo Finance Admin",
    title: "Finance Administrator",
    department: "Finance",
    role: "payroll_admin"
  }
];

const admin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function requireData(result, message) {
  if (result.error) throw new Error(`${message}: ${result.error.message}`);
  return result.data;
}

async function getOrCreateUser(account) {
  const existing = await admin.auth.admin.getUserByEmail(account.email);
  let user;

  if (existing.error && existing.error.status !== 404) {
    throw new Error(`Looking up ${account.email}: ${existing.error.message}`);
  }

  if (existing.data.user) {
    user = await requireData(
      await admin.auth.admin.updateUserById(existing.data.user.id, {
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName }
      }),
      `Updating ${account.email}`
    );
  } else {
    user = await requireData(
      await admin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: { full_name: account.fullName }
      }),
      `Creating ${account.email}`
    );
  }

  return user.user;
}

const organisationRows = await requireData(
  await admin.from("organisations").select("id").eq("name", "Rework-Aware Demo Workspace").limit(1),
  "Finding demo workspace"
);

let organisationId = organisationRows[0]?.id;
if (!organisationId) {
  const organisation = await requireData(
    await admin
      .from("organisations")
      .insert({ name: "Rework-Aware Demo Workspace" })
      .select("id")
      .single(),
    "Creating demo workspace"
  );
  organisationId = organisation.id;
}

for (const account of demoAccounts) {
  const user = await getOrCreateUser(account);
  const employee = await requireData(
    await admin
      .from("employees")
      .upsert(
        {
          organisation_id: organisationId,
          auth_user_id: user.id,
          full_name: account.fullName,
          email: account.email,
          title: account.title,
          department: account.department,
          active: true
        },
        { onConflict: "organisation_id,email" }
      )
      .select("id")
      .single(),
    `Creating employee profile for ${account.email}`
  );

  await requireData(
    await admin.from("memberships").upsert(
      {
        organisation_id: organisationId,
        user_id: user.id,
        employee_id: employee.id,
        role: account.role
      },
      { onConflict: "organisation_id,user_id" }
    ),
    `Creating membership for ${account.email}`
  );
}

console.log(`Demo workspace: ${organisationId}`);
console.log("Demo accounts (email confirmation is already enabled):");
for (const account of demoAccounts) {
  console.log(`- ${account.role}: ${account.email} / ${account.password}`);
}
