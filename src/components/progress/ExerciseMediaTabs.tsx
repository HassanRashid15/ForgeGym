"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Film, Play, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExerciseMediaTabsProps = {
  loading?: boolean;
  exerciseName: string;
  animationUrl?: string | null;
  videoUrl?: string | null;
  youtubeVideoId?: string | null;
  youtubeTitle?: string | null;
  youtubeSearchUrl?: string | null;
  posterUrl?: string | null;
  attribution?: string | null;
  className?: string;
};

export function ExerciseMediaTabs({
  loading,
  exerciseName,
  animationUrl,
  videoUrl,
  youtubeVideoId,
  youtubeTitle,
  youtubeSearchUrl,
  posterUrl,
  attribution,
  className,
}: ExerciseMediaTabsProps) {
  const hasAnimation = Boolean(animationUrl);
  const hasMp4 = Boolean(videoUrl);
  const hasYoutube = Boolean(youtubeVideoId);

  const defaultTab = hasAnimation
    ? "animation"
    : hasMp4
      ? "video"
      : hasYoutube
        ? "youtube"
        : "animation";

  const [tab, setTab] = useState(defaultTab);

  // When media finishes loading, jump to the best available tab if current is empty
  useEffect(() => {
    if (loading) return;
    if (tab === "animation" && !hasAnimation) {
      if (hasMp4) setTab("video");
      else if (hasYoutube) setTab("youtube");
    } else if (tab === "video" && !hasMp4) {
      if (hasAnimation) setTab("animation");
      else if (hasYoutube) setTab("youtube");
    } else if (tab === "youtube" && !hasYoutube) {
      if (hasAnimation) setTab("animation");
      else if (hasMp4) setTab("video");
    }
  }, [loading, hasAnimation, hasMp4, hasYoutube, tab]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          How to
        </p>
        {attribution ? (
          <p className="text-[10px] text-muted-foreground">{attribution}</p>
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid h-9 w-full grid-cols-3">
          <TabsTrigger
            value="animation"
            className="gap-1 text-xs sm:gap-1.5"
            disabled={!hasAnimation && !loading}
          >
            <Film className="h-3.5 w-3.5 shrink-0" />
            Animation
          </TabsTrigger>
          <TabsTrigger
            value="video"
            className="gap-1 text-xs sm:gap-1.5"
            disabled={!hasMp4 && !loading}
          >
            <Play className="h-3.5 w-3.5 shrink-0" />
            Video
          </TabsTrigger>
          <TabsTrigger
            value="youtube"
            className="gap-1 text-xs sm:gap-1.5"
            disabled={!hasYoutube && !loading && !youtubeSearchUrl}
          >
            <Youtube className="h-3.5 w-3.5 shrink-0" />
            YouTube
          </TabsTrigger>
        </TabsList>

        <TabsContent value="animation" className="mt-2 outline-none">
          <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
            {loading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading animation…
              </div>
            ) : animationUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={animationUrl}
                src={animationUrl}
                alt={`${exerciseName} form animation`}
                className="h-full w-full object-contain bg-black"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
                No animation available for this exercise
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="video" className="mt-2 outline-none">
          <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
            {loading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading video…
              </div>
            ) : videoUrl ? (
              <video
                key={videoUrl}
                src={videoUrl}
                poster={posterUrl || undefined}
                controls
                muted
                playsInline
                loop
                autoPlay
                className="h-full w-full object-contain bg-black"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                <span>No MP4 video available</span>
                <span className="text-xs">
                  Try the YouTube tab, or set EXERCISEDB_RAPIDAPI_KEY for clips.
                </span>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="youtube" className="mt-2 outline-none">
          <div className="relative aspect-video overflow-hidden rounded-md bg-muted">
            {loading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding YouTube demo…
              </div>
            ) : youtubeVideoId ? (
              <iframe
                key={youtubeVideoId}
                title={youtubeTitle || `How to do ${exerciseName}`}
                src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?rel=0`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                <span>No embedded YouTube video found</span>
                {youtubeSearchUrl ? (
                  <a
                    href={youtubeSearchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Search on YouTube
                  </a>
                ) : null}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
