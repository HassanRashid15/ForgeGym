import { NextResponse } from "next/server";
import { createSupabaseCookieClient } from "@/lib/supabase/server";
import { getRequestId } from "@/lib/api/errors";

/** GET /api/newsletter/check - Check if email is subscribed (read-only) */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim()?.toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Valid email address is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createSupabaseCookieClient();

    // Check if email is already subscribed using the read-only function
    const { data: existingSubscription } = await (supabase.rpc as any)("check_newsletter_subscription", {
      p_email: email,
    });

    return NextResponse.json({
      success: true,
      is_subscribed: existingSubscription?.is_subscribed || false,
      is_active: existingSubscription?.is_active || false,
    });
  } catch (error) {
    console.error("Newsletter check API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}