import { NextResponse } from "next/server";
import {
  createSupabaseCookieClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { jsonError, rateLimitedResponse, getRequestId } from "@/lib/api/errors";

/**
 * POST /api/auth/mark-verified
 * Marks profiles.is_verified after the user proves email ownership
 * (session from confirmation link with email_confirmed_at set).
 */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "auth:mark-verified"), 20, 60_000);
  if (!limited.allowed) {
    return rateLimitedResponse(limited);
  }

  const cookieClient = await createSupabaseCookieClient();
  const {
    data: { user },
  } = await cookieClient.auth.getUser();

  if (!user?.id) {
    return jsonError("Not authenticated", 401, { requestId });
  }

  if (!user.email_confirmed_at) {
    return jsonError("Email is not confirmed yet", 403, {
      code: "email_not_confirmed",
      requestId,
    });
  }

  const service = createSupabaseServiceClient();
  if (!service) {
    return jsonError("Server misconfigured", 500, { requestId });
  }

  const { error } = await service
    .from("profiles")
    .update({
      is_verified: true,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("user_id", user.id);

  if (error) {
    return jsonError(error.message, 400, { requestId });
  }

  return NextResponse.json({ ok: true, verified: true });
}
