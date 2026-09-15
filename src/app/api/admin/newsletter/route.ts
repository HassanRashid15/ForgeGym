import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestId } from "@/lib/api/errors";

/** GET /api/admin/newsletter - Get all newsletter subscribers (superadmin only) */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const supabase = createSupabaseServerClient();

  try {
    // Check if user is superadmin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check superadmin status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("user_id", user.id)
      .single();

    if (!profile || !profile.is_super_admin) {
      return NextResponse.json(
        { error: "Forbidden - Superadmin access required" },
        { status: 403 }
      );
    }

    // Get all newsletter subscriptions
    const { data: subscriptions, error } = await (supabase.rpc as any)("get_newsletter_subscriptions");

    if (error) {
      console.error("Error fetching newsletter subscriptions:", error);
      return NextResponse.json(
        { error: "Failed to fetch subscriptions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscriptions: subscriptions || [],
      total: subscriptions?.length || 0,
    });
  } catch (error) {
    console.error("Newsletter subscribers API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** DELETE /api/admin/newsletter - Unsubscribe a user (superadmin only) */
export async function DELETE(request: Request) {
  const requestId = getRequestId(request);
  const supabase = createSupabaseServerClient();

  try {
    // Check if user is superadmin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check superadmin status
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("user_id", user.id)
      .single();

    if (!profile || !profile.is_super_admin) {
      return NextResponse.json(
        { error: "Forbidden - Superadmin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const email = body?.email;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Unsubscribe the user using the function
    const { data, error } = await (supabase.rpc as any)("unsubscribe_from_newsletter", {
      p_email: email,
      p_reason: body?.reason || null
    });

    if (error) {
      console.error("Error unsubscribing user:", error);
      return NextResponse.json(
        { error: "Failed to unsubscribe user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "User unsubscribed successfully",
    });
  } catch (error) {
    console.error("Newsletter unsubscribe API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}