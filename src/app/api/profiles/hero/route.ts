import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { cacheInvalidate } from "@/lib/api-cache";

/** POST /api/profiles/hero — any authenticated role uploads personal dashboard/profile hero */
export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() || "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const path = `${user.id}/dashboard-hero.${ext || "jpg"}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json(
      {
        error:
          uploadError.message ||
          "Upload failed. Create the 'avatars' bucket in Supabase Storage if missing.",
      },
      { status: 400 },
    );
  }

  const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
  const heroUrl = `${publicData.publicUrl}?t=${Date.now()}`;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({
      dashboard_hero_url: heroUrl,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("user_id", user.id)
    .select("dashboard_hero_url")
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({
      dashboard_hero_url: heroUrl,
      warning: profileError.message,
    });
  }

  if (!profile) {
    const todayDate = new Date().toISOString().split("T")[0];
    await supabase.from("profiles").insert({
      id: user.id,
      user_id: user.id,
      email: user.email,
      full_name:
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Member",
      membership_status: "active",
      membership_type: "basic",
      join_date: todayDate,
      dashboard_hero_url: heroUrl,
    } as never);
  }

  await cacheInvalidate({
    prefixes: ["api-cache:auth-me:", "api-cache:profiles:"],
  });

  return NextResponse.json({
    dashboard_hero_url: heroUrl,
    profile: profile ?? null,
  });
}

/** DELETE /api/profiles/hero — clear personal hero (falls back to gym main / preloader) */
export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;

  const { error } = await supabase
    .from("profiles")
    .update({
      dashboard_hero_url: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Best-effort remove storage object (any extension)
  try {
    const { data: listed } = await supabase.storage.from("avatars").list(user.id, {
      search: "dashboard-hero",
    });
    const names = (listed || [])
      .map((f) => f.name)
      .filter((n) => n.startsWith("dashboard-hero."))
      .map((n) => `${user.id}/${n}`);
    if (names.length) {
      await supabase.storage.from("avatars").remove(names);
    }
  } catch {
    // ignore storage cleanup failures
  }

  await cacheInvalidate({
    prefixes: ["api-cache:auth-me:", "api-cache:profiles:"],
  });

  return NextResponse.json({ dashboard_hero_url: null });
}
