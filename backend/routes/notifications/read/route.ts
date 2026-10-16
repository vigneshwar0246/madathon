import { z } from "zod";
import { requireUser, rpcError } from "@backend/api/context";
import { errorResponse, privateJson } from "@backend/api/errors";

export async function POST(request: Request) {
  try {
    const { supabase } = await requireUser();
    const { id } = z.object({ id: z.uuid() }).parse(await request.json());
    const { error } = await supabase.rpc("mark_notification_read", { p_notification: id });
    rpcError(error);
    return privateJson({ ok: true });
  } catch (error) { return errorResponse(error); }
}
