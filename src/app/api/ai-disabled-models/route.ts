import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    console.log("GET - Auth header:", authHeader ? "Present" : "Missing");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized", disabledModels: [] }, { status: 200 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);

    console.log("GET - User check:", error ? error.message : "Success", user?.id);

    if (error || !user) {
      return NextResponse.json({ error: "Invalid token", disabledModels: [] }, { status: 200 });
    }

    const { data: disabledModels, error: dbError } = await supabase
      .from("ai_models")
      .select("provider, model")
      .eq("user_id", user.id)
      .eq("is_disabled", true);

    console.log("GET - Disabled models:", disabledModels, dbError);

    if (dbError) {
      console.error("Error fetching disabled models:", dbError);
      return NextResponse.json({ error: "Failed to fetch disabled models", disabledModels: [] }, { status: 200 });
    }

    const modelKeys = disabledModels?.map((m) => `${m.provider}/${m.model}`) || [];
    console.log("GET - Returning model keys:", modelKeys);
    return NextResponse.json({ disabledModels: modelKeys });
  } catch (error) {
    console.error("Error in GET /api/ai-disabled-models:", error);
    return NextResponse.json({ error: "Internal server error", disabledModels: [] }, { status: 200 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    console.log("DELETE - Auth header:", authHeader ? "Present" : "Missing");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);

    console.log("DELETE - User check:", error ? error.message : "Success", user?.id);

    if (error || !user) {
      return NextResponse.json({ error: "Invalid token", success: false }, { status: 401 });
    }

    // Delete all disabled models for this user
    const { error: deleteError } = await supabase
      .from("ai_models")
      .delete()
      .eq("user_id", user.id)
      .eq("is_disabled", true);

    console.log("DELETE - Delete result:", deleteError ? deleteError.message : "Success");

    if (deleteError) {
      console.error("Error resetting disabled models:", deleteError);
      return NextResponse.json({ error: "Failed to reset disabled models", success: false }, { status: 500 });
    }

    console.log("DELETE - Success");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/ai-disabled-models:", error);
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    console.log("POST - Auth header:", authHeader ? "Present" : "Missing");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);

    console.log("POST - User check:", error ? error.message : "Success", user?.id);

    if (error || !user) {
      return NextResponse.json({ error: "Invalid token", success: false }, { status: 401 });
    }

    const body = await request.json();
    const { provider, model, enabled } = body;

    console.log("POST - Toggle request:", { provider, model, enabled, userId: user.id });

    if (!provider || !model) {
      return NextResponse.json({ error: "Provider and model are required", success: false }, { status: 400 });
    }

    // Always upsert the flag — never delete the row (keeps speed-test history intact)
    const { error: upsertError } = await supabase
      .from("ai_models")
      .upsert(
        {
          user_id: user.id,
          provider,
          model,
          is_disabled: !enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider,model" },
      );

    console.log("POST - Upsert result:", upsertError ? upsertError.message : "Success", {
      provider,
      model,
      is_disabled: !enabled,
    });

    if (upsertError) {
      console.error("Error updating model enabled state:", upsertError);
      return NextResponse.json(
        { error: enabled ? "Failed to enable model" : "Failed to disable model", success: false },
        { status: 500 },
      );
    }

    console.log("POST - Success");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/ai-disabled-models:", error);
    return NextResponse.json({ error: "Internal server error", success: false }, { status: 500 });
  }
}
