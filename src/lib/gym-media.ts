import type { SupabaseClient } from "@supabase/supabase-js";

type UploadKind = "main-image" | "optional-image" | "logo" | "video";

function extFromFile(file: File, fallback: string) {
  const raw = (file.name.split(".").pop() || fallback).toLowerCase().replace(/[^a-z0-9]/g, "");
  return raw || fallback;
}

/** Upload gym media with service role (used during signup before user session exists). */
export async function uploadGymMediaFile(
  service: SupabaseClient,
  userId: string,
  file: File,
  kind: UploadKind,
): Promise<string> {
  const isImage =
    kind === "main-image" || kind === "optional-image" || kind === "logo";
  const maxSize = isImage ? 5 * 1024 * 1024 : 50 * 1024 * 1024;

  if (isImage && !file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed for gym photos");
  }
  if (kind === "video" && !file.type.startsWith("video/")) {
    throw new Error("Only video files are allowed for gym videos");
  }
  if (file.size > maxSize) {
    throw new Error(`File must be under ${isImage ? "5MB" : "50MB"}`);
  }

  const timestamp = Date.now();
  const ext = extFromFile(file, isImage ? "jpg" : "mp4");
  const filename = `${kind}-${timestamp}.${ext}`;
  const path = `${userId}/${filename}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await service.storage.from("gym-media").upload(path, bytes, {
    contentType: file.type || (isImage ? "image/jpeg" : "video/mp4"),
    upsert: true,
  });

  if (error) {
    throw new Error(error.message || "Failed to upload gym media");
  }

  const { data } = service.storage.from("gym-media").getPublicUrl(path);
  return `${data.publicUrl}?t=${timestamp}`;
}
