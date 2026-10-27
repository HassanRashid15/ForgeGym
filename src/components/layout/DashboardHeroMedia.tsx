"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadMyDashboardHero, clearMyDashboardHero } from "@/api/profiles";
import { useAuth } from "@/contexts/AuthContext";
import {
  DASHBOARD_HERO_PRELOADER,
  resolveDashboardHeroUrl,
  type HeroImageSource,
} from "@/lib/dashboard-hero";
import { cn } from "@/lib/utils";

type Height = "dashboard" | "profile";

const HEIGHT: Record<Height, string> = {
  dashboard: "h-[65vh]",
  profile: "h-[42vh] sm:h-[46vh] md:h-[50vh]",
};

type Props = {
  source: HeroImageSource | null | undefined;
  /** Controlled override (e.g. local profile state after upload). */
  imageUrl?: string | null;
  height?: Height;
  className?: string;
  /** Show centered change/remove controls (Edit Profile / edit mode). */
  editable?: boolean;
  onHeroChange?: (url: string | null) => void;
};

/**
 * Full-bleed hero media for every role — uploaded image or preloader fallback.
 * Not role-specific; parents pass auth/profile image fields.
 */
export function DashboardHeroMedia({
  source,
  imageUrl,
  height = "dashboard",
  className,
  editable = false,
  onHeroChange,
}: Props) {
  const { refreshUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const resolved = resolveDashboardHeroUrl({
    dashboardHeroUrl:
      imageUrl !== undefined ? imageUrl : source?.dashboardHeroUrl,
    gymMainImageUrl: source?.gymMainImageUrl,
  });

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setBusy(true);
    try {
      const { dashboard_hero_url } = await uploadMyDashboardHero(file);
      onHeroChange?.(dashboard_hero_url);
      void refreshUser();
      toast.success("Background image updated");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload background",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await clearMyDashboardHero();
      onHeroChange?.(null);
      void refreshUser();
      toast.success("Background cleared");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to clear background",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {resolved ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt=""
          className={cn(
            "block w-full object-cover object-center",
            HEIGHT[height],
            className,
          )}
        />
      ) : (
        <div
          className={cn(
            "flex w-full items-center justify-center bg-[#0D0D0D]",
            HEIGHT[height],
            className,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DASHBOARD_HERO_PRELOADER}
            alt=""
            className="h-12 w-auto object-contain opacity-90 sm:h-16 md:h-20"
            draggable={false}
          />
        </div>
      )}

      {editable ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
          <div className="pointer-events-auto flex flex-col items-center gap-2 sm:flex-row">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <Button
              type="button"
              size="sm"
              className="gap-2 bg-primary/95 shadow-lg backdrop-blur-sm hover:bg-primary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              {resolved ? "Change background" : "Upload background"}
            </Button>
            {resolved ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2 border-border/80 bg-background/50 backdrop-blur-sm"
                disabled={busy}
                onClick={() => void clear()}
              >
                <X className="h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
