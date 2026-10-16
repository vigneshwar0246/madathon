import { TeamLeadPortalPage } from "@/components/team-lead-portal";
import { requirePortalAccess } from "@/lib/auth/portal";

export default async function LeadPage() {
  await requirePortalAccess("lead");
  return <TeamLeadPortalPage />;
}
