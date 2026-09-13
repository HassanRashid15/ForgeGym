import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { notify } from "@/lib/notify-actions";

/** POST /api/profiles/avatar — upload avatar to storage bucket */
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

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${user.id}/avatar.${ext || "jpg"}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, {
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
  const avatarUrl = `${publicData.publicUrl}?t=${Date.now()}`;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ avatar_url: avatarUrl, warning: profileError.message });
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
      avatar_url: avatarUrl,
    } as any);
  }

  void notify.avatarUpdated(user.id);

  return NextResponse.json({ avatar_url: avatarUrl, profile: profile ?? null });
}
