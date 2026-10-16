import { z } from "zod";
import { requireUser, rpcError } from "@/lib/api/context";
import { errorResponse, privateJson } from "@/lib/api/errors";

export async function POST(request: Request) {
  try {
    const { supabase } = await requireUser();
    const { name } = z.object({ name: z.string().trim().min(2).max(120) }).parse(await request.json());
    const { data, error } = await supabase.rpc("create_organisation", { p_name: name });
    rpcError(error);
    return privateJson({ id: data }, 201);
  } catch (error) { return errorResponse(error); }
}
