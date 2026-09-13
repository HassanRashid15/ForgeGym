"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, Video, Image as ImageIcon, Loader2 } from "lucide-react";
import { uploadGymMedia, updateMyProfile } from "@/api/profiles";

export type GymMediaValues = {
  mainImageUrl: string;
  optionalImagesUrls: string[];
  videoUrl: string;
  videoFileUrl: string;
};

type GymMediaSectionProps = GymMediaValues & {
  onUpdate: (media: GymMediaValues) => void;
  /** Persist media URLs to profiles immediately after upload */
  persistToDb?: boolean;
  readOnly?: boolean;
};

export function GymMediaSection({
  mainImageUrl,
  optionalImagesUrls,
  videoUrl,
  videoFileUrl,
  onUpdate,
  persistToDb = true,
  readOnly = false,
}: GymMediaSectionProps) {
  const mainInputId = useId();
  const optionalInputId = useId();
  const videoInputId = useId();
  const mainInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [mainPreview, setMainPreview] = useState(mainImageUrl);
  const [optionalPreviews, setOptionalPreviews] = useState<string[]>(optionalImagesUrls);
  const [localVideoUrl, setLocalVideoUrl] = useState(videoUrl);

  useEffect(() => {
    setMainPreview(mainImageUrl);
  }, [mainImageUrl]);

  useEffect(() => {
    setOptionalPreviews(optionalImagesUrls);
  }, [optionalImagesUrls]);

  useEffect(() => {
    setLocalVideoUrl(videoUrl);
  }, [videoUrl]);

  const persist = async (media: GymMediaValues) => {
    onUpdate(media);
    if (!persistToDb) return;
    await updateMyProfile({
      gym_main_image_url: media.mainImageUrl || null,
      gym_optional_images_urls: media.optionalImagesUrls.length
        ? media.optionalImagesUrls
        : null,
      gym_video_url: media.videoUrl.trim() || null,
      gym_video_file_url: media.videoFileUrl || null,
    });
  };

  const uploadMain = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    const preview = URL.createObjectURL(file);
    setMainPreview(preview);
    setUploading(true);
    try {
      const { url } = await uploadGymMedia(file, "main-image");
      await persist({
        mainImageUrl: url,
        optionalImagesUrls,
        videoUrl: localVideoUrl,
        videoFileUrl,
      });
      setMainPreview(url);
      toast.success("Main gym image saved");
    } catch (err: any) {
      setMainPreview(mainImageUrl);
      toast.error(err?.message || "Failed to upload main image");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(preview);
      if (mainInputRef.current) mainInputRef.current.value = "";
    }
  };

  const uploadOptional = async (files: File[]) => {
    if (files.length + optionalImagesUrls.length > 5) {
      toast.error("Maximum 5 optional images allowed");
      return;
    }
    const valid = files.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      return true;
    });
    if (valid.length === 0) return;

    setUploading(true);
    try {
      const urls = [...optionalImagesUrls];
      for (const file of valid) {
        const { url } = await uploadGymMedia(file, "optional-image");
        urls.push(url);
      }
      await persist({
        mainImageUrl,
        optionalImagesUrls: urls,
        videoUrl: localVideoUrl,
        videoFileUrl,
      });
      setOptionalPreviews(urls);
      toast.success("Gallery images saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const uploadVideo = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Video must be under 50MB");
      return;
    }
    if (!file.type.startsWith("video/")) {
      toast.error("Only video files are allowed");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadGymMedia(file, "video");
      await persist({
        mainImageUrl,
        optionalImagesUrls,
        videoUrl: localVideoUrl,
        videoFileUrl: url,
      });
      toast.success("Gym video saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const removeOptionalAt = async (index: number) => {
    const nextSaved = optionalImagesUrls.filter((_, i) => i !== index);
    setOptionalPreviews(nextSaved);
    try {
      await persist({
        mainImageUrl,
        optionalImagesUrls: nextSaved,
        videoUrl: localVideoUrl,
        videoFileUrl,
      });
      toast.success("Image removed");
    } catch (err: any) {
      setOptionalPreviews(optionalImagesUrls);
      toast.error(err?.message || "Failed to remove image");
    }
  };

  const clearMain = async () => {
    setMainPreview("");
    try {
      await persist({
        mainImageUrl: "",
        optionalImagesUrls,
        videoUrl: localVideoUrl,
        videoFileUrl,
      });
      toast.success("Main image cleared");
    } catch (err: any) {
      setMainPreview(mainImageUrl);
      toast.error(err?.message || "Failed to clear image");
    }
  };

  const saveVideoUrl = async () => {
    try {
      await persist({
        mainImageUrl,
        optionalImagesUrls,
        videoUrl: localVideoUrl,
        videoFileUrl,
      });
      toast.success("Video link saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save video link");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Main gym image</Label>

        {readOnly ? (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
            {mainPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mainPreview} alt="Gym main" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
          </div>
        ) : (
          <>
            <input
              ref={mainInputRef}
              id={mainInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadMain(file);
              }}
            />
            <label
              htmlFor={mainInputId}
              className={`relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
                mainPreview
                  ? "border-zinc-600"
                  : "border-zinc-600 bg-zinc-950 hover:border-[#EF1111]/60 hover:bg-zinc-900"
              } ${uploading ? "pointer-events-none opacity-70" : ""}`}
            >
              {mainPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mainPreview} alt="Gym main" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 px-4 text-center text-zinc-400">
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-[#EF1111]" />
                  ) : (
                    <Upload className="h-8 w-8 text-[#EF1111]" />
                  )}
                  <span className="text-sm font-medium text-zinc-200">
                    {uploading ? "Uploading…" : "Click to upload main image"}
                  </span>
                  <span className="text-xs text-zinc-500">JPG, PNG, WebP · max 5MB</span>
                </div>
              )}
              {mainPreview && !uploading && (
                <span className="absolute inset-x-0 bottom-0 bg-black/65 py-2 text-center text-xs text-white">
                  Click to replace image
                </span>
              )}
            </label>
            {mainPreview && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => mainInputRef.current?.click()}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={() => void clearMain()}
                >
                  Remove
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label>Optional images (max 5)</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {optionalPreviews.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative aspect-square overflow-hidden rounded-lg border border-zinc-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Gym ${index + 1}`} className="h-full w-full object-cover" />
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => void removeOptionalAt(index)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white"
                  aria-label="Remove image"
                  disabled={uploading}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {!readOnly && optionalPreviews.length < 5 && (
            <label
              htmlFor={optionalInputId}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-zinc-700 hover:border-[#EF1111]/60"
            >
              <input
                id={optionalInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = "";
                  if (files.length) void uploadOptional(files);
                }}
              />
              {uploading ? (
                <Loader2 className="h-7 w-7 animate-spin text-zinc-500" />
              ) : (
                <Upload className="h-7 w-7 text-zinc-500" />
              )}
              <span className="px-2 text-center text-[11px] text-zinc-500">Add photos</span>
            </label>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Video link (optional)</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="url"
            placeholder="YouTube / Vimeo / other URL"
            value={localVideoUrl}
            onChange={(e) => setLocalVideoUrl(e.target.value)}
            readOnly={readOnly}
            className="bg-zinc-900 border-zinc-700"
          />
          {!readOnly && (
            <Button type="button" variant="outline" onClick={() => void saveVideoUrl()} disabled={uploading}>
              Save link
            </Button>
          )}
        </div>
        {!readOnly && (
          <div className="space-y-2">
            <Label className="text-muted-foreground" htmlFor={videoInputId}>
              Or upload a video file (max 50MB)
            </Label>
            <Input
              id={videoInputId}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              disabled={uploading}
              className="bg-zinc-900 border-zinc-700"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadVideo(file);
              }}
            />
          </div>
        )}
        {videoFileUrl && (
          <p className="flex items-center gap-2 break-all text-xs text-muted-foreground">
            <Video className="h-3.5 w-3.5 shrink-0" />
            {videoFileUrl.split("?")[0]}
          </p>
        )}
      </div>

      {uploading && (
        <p className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="h-4 w-4 animate-spin text-[#EF1111]" />
          Uploading to gym-media bucket…
        </p>
      )}
    </div>
  );
}
