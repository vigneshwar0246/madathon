import { EmployeePortalPage } from "@/components/employee-portal";
import { requirePortalAccess } from "@/lib/auth/portal";

const allowed = ["overview", "tasks", "rework", "logs", "payroll", "reports", "notifications", "profile"] as const;
type EmployeeModule = (typeof allowed)[number];

export default async function EmployeeModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  await requirePortalAccess("employee");
  return <EmployeePortalPage initialModule={(allowed.includes(module as EmployeeModule) ? module : "overview") as EmployeeModule} />;
}
