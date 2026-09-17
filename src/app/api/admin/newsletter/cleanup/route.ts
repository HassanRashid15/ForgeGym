import { NextResponse } from "next/server";
import { createSupabaseCookieClient } from "@/lib/supabase/server";
import { getRequestId } from "@/lib/api/errors";

/** POST /api/admin/newsletter/cleanup - Clean up expired subscriptions (superadmin only) */
export async function POST(request: Request) {
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

    // Call the cleanup function
    const { data, error } = await (supabase.rpc as any)("cleanup_expired_subscriptions");

    if (error) {
      console.error("Error cleaning up expired subscriptions:", error);
      return NextResponse.json(
        { error: "Failed to cleanup expired subscriptions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_count: data,
      message: `Cleaned up ${data} expired subscription(s)`,
    });
  } catch (error) {
    console.error("Newsletter cleanup API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}