import { requirePortalAccess } from "@/lib/auth/portal";
import { FinancePortalPage } from "@/components/finance-portal";

export default async function FinancePage() {
  await requirePortalAccess("finance");
  return <FinancePortalPage />;
}
