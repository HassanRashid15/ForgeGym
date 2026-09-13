import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { deletePersonalRecord } from "@/lib/progress";

/** DELETE /api/progress/records?id=... */
export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user, supabase } = auth;
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return jsonError("id required", 400);

  try {
    await deletePersonalRecord(supabase, user.id, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return jsonError(err?.message || "Failed to delete record", 400);
  }
}
