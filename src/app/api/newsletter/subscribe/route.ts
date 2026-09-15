import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { rateLimitedResponse, getRequestId } from "@/lib/api/errors";
import { trackEvent } from "@/lib/monitoring";

/** POST /api/newsletter/subscribe */
export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const limited = await rateLimit(clientKey(request, "newsletter:subscribe"), 3, 60_000);
  if (!limited.allowed) {
    trackEvent("newsletter.rate_limited", { route: "subscribe", requestId });
    return rateLimitedResponse(limited);
  }

  try {
    const body = await request.json();
    const email = body?.email?.trim()?.toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    // Call the Supabase function to handle subscription
    const { data, error } = await (supabase.rpc as any)("subscribe_to_newsletter", {
      p_email: email,
    });

    if (error) {
      console.error("Newsletter subscription error:", error);
      return NextResponse.json(
        { error: "Failed to subscribe to newsletter" },
        { status: 500 }
      );
    }

    const result = data as any;

    if (result.success) {
      trackEvent("newsletter.subscribed", { 
        email: email.substring(0, 3) + "***" + email.substring(email.indexOf("@")),
        already_subscribed: result.already_subscribed,
        reactivated: result.reactivated,
        new_subscription: result.new_subscription,
        requestId 
      });

      return NextResponse.json({
        success: true,
        message: result.message,
        already_subscribed: result.already_subscribed,
        reactivated: result.reactivated,
        new_subscription: result.new_subscription,
      });
    } else {
      return NextResponse.json(
        { error: result.message || "Subscription failed" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Newsletter subscription API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}