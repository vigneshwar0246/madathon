import { requireUser } from "@backend/api/context";
import { errorResponse, privateJson, ApiError } from "@backend/api/errors";
import { loadSnapshot } from "@backend/api/snapshot";
import type { WorkspaceIdentity } from "@shared/types";

async function bootstrap(acceptInvitations: boolean) {
  try {
    const { supabase, userId } = await requireUser();
    if (acceptInvitations) {
      const accepted = await supabase.rpc("accept_pending_invitations");
      if (accepted.error) throw new ApiError(accepted.error.message, 500);
    }
    const { data: memberships, error } = await supabase.from("memberships").select("organisation_id,employee_id,role").eq("user_id", userId).limit(1);
    if (error) throw new ApiError(error.message, 500);
    if (!memberships?.length) return privateJson({ needsOnboarding: true });
    const membership = memberships[0];
    const { data: organisation, error: orgError } = await supabase.from("organisations").select("name").eq("id", membership.organisation_id).single();
    if (orgError || !organisation) throw new ApiError("Workspace not found", 404);
    const identity: WorkspaceIdentity = { organisationId: membership.organisation_id, organisationName: organisation.name, employeeId: membership.employee_id, userId, role: membership.role as WorkspaceIdentity["role"] };
    return privateJson({ identity, data: await loadSnapshot(supabase, identity) });
  } catch (error) { return errorResponse(error); }
}
export async function GET() { return bootstrap(false); }
export async function POST() { return bootstrap(true); }
