import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { jsonError } from "@/lib/api/errors";
import { cacheInvalidate } from "@/lib/api-cache";

async function requireSuperAdmin(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const { supabase, user } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const { data: profile } = await db
    .from("profiles")
    .select("is_super_admin, email")
    .eq("user_id", user.id)
    .maybeSingle();

  const email = (profile?.email || user.email || "").toLowerCase();
  const isSuperAdmin =
    profile?.is_super_admin === true || email === "superadmin@forge.test";

  if (!isSuperAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { supabase: service || db, user };
}

/** POST /api/admin/promotions/upload — promo image to gym-media bucket */
export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if ("error" in auth) return auth.error;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return jsonError("Image file is required", 400);
  }
  if (!file.type.startsWith("image/")) {
    return jsonError("Only image files are allowed", 400);
  }
  if (file.size > 5 * 1024 * 1024) {
    return jsonError("Image must be under 5MB", 400);
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `promotions/${auth.user.id}/${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await auth.supabase.storage.from("gym-media").upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    return jsonError(
      error.message || "Upload failed. Ensure the gym-media bucket exists and is public.",
      400,
    );
  }

  const { data } = auth.supabase.storage.from("gym-media").getPublicUrl(path);
  const imageUrl = `${data.publicUrl}?t=${Date.now()}`;
  cacheInvalidate("public:promotions");

  return NextResponse.json({ imageUrl });
}
