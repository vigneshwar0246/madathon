import { createClient } from "@backend/supabase/server";
import { ApiError } from "./errors";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) throw new ApiError("Sign in required", 401);
  return { supabase, userId: claims.sub };
}

export async function requireWorkspace(request: Request) {
  const { supabase, userId } = await requireUser();
  const organisationId = request.headers.get("x-organisation-id");
  if (!organisationId || !/^[0-9a-f-]{36}$/i.test(organisationId)) throw new ApiError("Select a workspace", 400);
  const { data, error } = await supabase.from("memberships").select("organisation_id,employee_id,role").eq("organisation_id", organisationId).eq("user_id", userId).single();
  if (error || !data) throw new ApiError("Workspace access denied", 403);
  return { supabase, userId, organisationId, employeeId: data.employee_id as string, role: data.role as string };
}

export function requireRole(role: string, allowed: string[]) {
  if (!allowed.includes(role)) throw new ApiError("Insufficient permissions", 403);
}

export function rpcError(error: { message: string; code?: string } | null) {
  if (error) throw new ApiError(error.code === "42501" ? "Action not permitted" : error.message, error.code === "42501" ? 403 : 400);
}
