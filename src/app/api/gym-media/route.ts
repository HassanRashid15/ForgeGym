import { NextResponse } from "next/server";
import {
  createSupabaseServiceClient,
  requireAuth,
} from "@/lib/supabase/server";
import { notify } from "@/lib/notify-actions";

async function requireGymOwner(request: Request) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth;

  const { user, supabase } = auth;
  const service = createSupabaseServiceClient();
  const db = service || supabase;

  const { data: roles } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const isAdmin = (roles || []).some((r) => r.role === "admin");
  if (!isAdmin) {
    return {
      error: NextResponse.json(
        { error: "Only gym owners can manage gym media" },
        { status: 403 },
      ),
    };
  }

  return { supabase, user, service };
}

/** POST /api/gym-media — upload gym images/videos (gym owners only) */
export async function POST(request: Request) {
  const auth = await requireGymOwner(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const form = await request.formData().catch(() => null);

  const file = form?.get("file");
  const fileType = form?.get("type") as string;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  if (!fileType) {
    return NextResponse.json({ error: "File type is required" }, { status: 400 });
  }

  const isImage =
    fileType === "main-image" ||
    fileType === "optional-image" ||
    fileType === "logo";
  const isVideo = fileType === "video";

  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "Invalid file type — use main-image, optional-image, logo, or video" },
      { status: 400 },
    );
  }

  if (isImage && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed for images" }, { status: 400 });
  }

  if (isVideo && !file.type.startsWith("video/")) {
    return NextResponse.json({ error: "Only video files are allowed for videos" }, { status: 400 });
  }

  const maxSize = isImage ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File must be under ${isImage ? "5MB" : "50MB"}` },
      { status: 400 },
    );
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const timestamp = Date.now();
  const filename = `${fileType}-${timestamp}.${ext || (isImage ? "jpg" : "mp4")}`;
  const path = `${user.id}/${filename}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage.from("gym-media").upload(path, bytes, {
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    return NextResponse.json(
      {
        error:
          uploadError.message ||
          "Upload failed. Create the 'gym-media' bucket in Supabase Storage if missing.",
      },
      { status: 400 },
    );
  }

  const { data: publicData } = supabase.storage.from("gym-media").getPublicUrl(path);
  void notify.gymMediaUploaded(user.id, String(fileType));
  return NextResponse.json({
    url: `${publicData.publicUrl}?t=${timestamp}`,
    type: fileType,
    filename,
  });
}

/** DELETE /api/gym-media — delete own gym media file */
export async function DELETE(request: Request) {
  const auth = await requireGymOwner(request);
  if ("error" in auth) return auth.error;

  const { supabase, user } = auth;
  const body = await request.json().catch(() => null);
  const filename = body?.filename;

  if (!filename || typeof filename !== "string") {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }

  const safeName = filename.replace(/^.*[\\/]/, "").replace(/\.\./g, "");
  if (!safeName) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const path = `${user.id}/${safeName}`;
  const { error: deleteError } = await supabase.storage.from("gym-media").remove([path]);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message || "Failed to delete file" },
      { status: 400 },
    );
  }

  void notify.gymMediaDeleted(user.id);

  return NextResponse.json({ success: true });
}
