import { redirect } from "next/navigation";
import { createClient } from "@backend/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export type EnabledPortal = "employee" | "lead" | "manager" | "finance";
type DatabaseRole = "employee" | "team_lead" | "owner" | "manager" | "payroll_admin";

const routeForRole: Record<DatabaseRole, string> = {
  employee: "/employee",
  team_lead: "/lead",
  owner: "/login",
  manager: "/manager",
  payroll_admin: "/finance"
};

export async function requirePortalAccess(portal: EnabledPortal) {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) redirect("/login");
  const { data: membership, error: membershipError } = await supabase.from("memberships").select("role").eq("user_id", userId).limit(1).maybeSingle();
  if (membershipError || !membership) redirect("/login?error=access");
  const role = membership.role as DatabaseRole;
  if (role === "employee" && portal === "employee") return role;
  if (role === "team_lead" && portal === "lead") return role;
  if (role === "manager" && portal === "manager") return role;
  if (role === "payroll_admin" && portal === "finance") return role;
  const destination = routeForRole[role];
  redirect(destination === "/login" ? "/login?error=disabled" : destination);
}
