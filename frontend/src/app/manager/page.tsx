import { requirePortalAccess } from "@/lib/auth/portal";
import { ManagerPortalPage } from "@/components/manager-portal";

export default async function ManagerPage() {
  await requirePortalAccess("manager");
  return <ManagerPortalPage />;
}
