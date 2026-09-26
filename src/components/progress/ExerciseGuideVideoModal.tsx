"use client";

import { useEffect, useState } from "react";
import { getExerciseDemo } from "@/api/progress";
import { ExerciseMediaTabs } from "@/components/progress/ExerciseMediaTabs";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  exerciseName: string | null;
  meta?: string | null;
  onClose: () => void;
};

export function ExerciseGuideVideoModal({
  open,
  exerciseName,
  meta,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [animationUrl, setAnimationUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [youtubeTitle, setYoutubeTitle] = useState<string | null>(null);
  const [searchUrl, setSearchUrl] = useState<string | null>(null);
  const [mediaSource, setMediaSource] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !exerciseName?.trim()) {
      setAnimationUrl(null);
      setVideoUrl(null);
      setImageUrl(null);
      setYoutubeId(null);
      setYoutubeTitle(null);
      setSearchUrl(null);
      setMediaSource(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getExerciseDemo(exerciseName.trim())
      .then((data) => {
        if (cancelled) return;
        setAnimationUrl(data.animationUrl || null);
        setVideoUrl(data.videoUrl || null);
        setImageUrl(data.imageUrl || null);
        setYoutubeId(data.youtubeVideoId);
        setYoutubeTitle(data.title);
        setSearchUrl(data.youtubeSearchUrl);
        setMediaSource(data.mediaSource || null);
      })
      .catch(() => {
        if (cancelled) return;
        setAnimationUrl(null);
        setVideoUrl(null);
        setYoutubeId(null);
        setSearchUrl(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(
            `${exerciseName.trim()} exercise proper form`,
          )}`,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, exerciseName]);

  if (!open || !exerciseName) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-guide-title"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close guide"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          How-to guide
        </p>
        <h2
          id="exercise-guide-title"
          className="mt-1 pr-8 text-xl font-semibold tracking-tight"
        >
          {exerciseName}
        </h2>
        {meta ? (
          <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
        ) : null}

        <div className="mt-5">
          <ExerciseMediaTabs
            loading={loading}
            exerciseName={exerciseName}
            animationUrl={animationUrl}
            videoUrl={videoUrl}
            youtubeVideoId={youtubeId}
            youtubeTitle={youtubeTitle}
            youtubeSearchUrl={searchUrl}
            posterUrl={imageUrl}
            attribution={
              mediaSource === "workoutdb"
                ? "Media: WorkoutDB"
                : mediaSource
                  ? "Media: ExerciseDB"
                  : null
            }
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
