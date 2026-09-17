import { NextResponse } from "next/server";
import { createSupabaseCookieClient } from "@/lib/supabase/server";
import { getRequestId } from "@/lib/api/errors";

/** GET /api/admin/newsletter - Get all newsletter subscribers (superadmin only) */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const supabase = await createSupabaseCookieClient();

  try {
    // Check if user is superadmin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Auth error:", userError);
      return NextResponse.json(
        { error: "Authentication failed", details: userError.message },
        { status: 401 }
      );
    }
    
    if (!user) {
      console.error("No user found in session");
      return NextResponse.json(
        { error: "No authenticated user found" },
        { status: 401 }
      );
    }

    // Check superadmin status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return NextResponse.json(
        { error: "Failed to verify user permissions", details: profileError.message },
        { status: 500 }
      );
    }

    if (!profile) {
      console.error("No profile found for user:", user.id);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    if (!profile.is_super_admin) {
      console.error("User is not superadmin:", user.id);
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
  const supabase = await createSupabaseCookieClient();

  try {
    // Check if user is superadmin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Auth error:", userError);
      return NextResponse.json(
        { error: "Authentication failed", details: userError.message },
        { status: 401 }
      );
    }
    
    if (!user) {
      console.error("No user found in session");
      return NextResponse.json(
        { error: "No authenticated user found" },
        { status: 401 }
      );
    }

    // Check superadmin status
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_super_admin")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return NextResponse.json(
        { error: "Failed to verify user permissions", details: profileError.message },
        { status: 500 }
      );
    }

    if (!profile) {
      console.error("No profile found for user:", user.id);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    if (!profile.is_super_admin) {
      console.error("User is not superadmin:", user.id);
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