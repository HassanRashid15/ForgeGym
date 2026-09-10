import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";

/** GET /api/profiles — current user's profile */
export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ profile: data });
}

/** POST /api/profiles — create default profile if missing */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const body = await request.json().catch(() => ({}));

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ profile: existing });
  }

  const todayDate = new Date().toISOString().split("T")[0];
  const fallbackName =
    body.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Member";

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      user_id: user.id,
      email: user.email,
      full_name: fallbackName,
      membership_status: "active",
      membership_type: "basic",
      join_date: todayDate,
      ...body,
    })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ profile: data }, { status: 201 });
}

/** PATCH /api/profiles — update current user's profile (creates row if missing) */
export async function PATCH(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  delete body.id;
  delete body.user_id;
  delete body.email;

  const updatePayload = {
    ...body,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (data) {
    return NextResponse.json({ profile: data });
  }

  const todayDate = new Date().toISOString().split("T")[0];
  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      user_id: user.id,
      email: user.email,
      full_name:
        body.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Member",
      membership_status: "active",
      membership_type: "basic",
      join_date: todayDate,
      ...updatePayload,
    })
    .select()
    .maybeSingle();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ profile: created });
}
