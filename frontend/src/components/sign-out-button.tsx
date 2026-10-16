"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ className = "" }: { className?: string }) {
  return <button className={className} onClick={async () => { await createClient().auth.signOut(); window.location.assign("/login"); }}><LogOut size={15} /> Sign out</button>;
}
