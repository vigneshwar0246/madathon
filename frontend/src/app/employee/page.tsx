import { EmployeePortalPage } from "@/components/employee-portal";
import { requirePortalAccess } from "@/lib/auth/portal";

export default async function EmployeePage() {
  await requirePortalAccess("employee");
  return <EmployeePortalPage />;
}
