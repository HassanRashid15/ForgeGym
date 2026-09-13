"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ComingSoonOverlayProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  /** "page" covers a full public page block; "section" overlays one homepage section */
  mode?: "page" | "section";
  children: ReactNode;
};

/**
 * Dim + blur the preview, with a Coming Soon card that stays centered in the
 * viewport while the user scrolls through the covered content (page mode).
 * Keep Navbar/Footer outside this wrapper for page mode.
 */
export function ComingSoonOverlay({
  title,
  description,
  icon: Icon,
  mode = "page",
  children,
}: ComingSoonOverlayProps) {
  const isSection = mode === "section";

  return (
    <div className={cn("relative", isSection && "overflow-hidden rounded-2xl")}>
      <div
        className="pointer-events-none select-none blur-[2px] brightness-50 saturate-50"
        aria-hidden
      >
        {children}
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-30 bg-background/55 backdrop-blur-[2px]"
        aria-hidden
      />

      {isSection ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-4 py-10 sm:py-14">
          <ComingSoonCard title={title} description={description} Icon={Icon} compact />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-40 px-4">
          <div className="sticky top-[50vh] flex -translate-y-1/2 justify-center py-8">
            <ComingSoonCard title={title} description={description} Icon={Icon} />
          </div>
        </div>
      )}
    </div>
  );
}

function ComingSoonCard({
  title,
  description,
  Icon,
  compact = false,
}: {
  title: string;
  description: string;
  Icon: LucideIcon;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto w-full rounded-2xl border border-border/80 bg-card/95 p-6 text-center shadow-2xl shadow-black/40 sm:p-8",
        compact ? "max-w-sm" : "max-w-md",
      )}
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <Badge variant="outline" className="mb-3 border-primary/40 text-primary">
        Coming soon
      </Badge>
      <h2
        className={cn(
          "font-bold tracking-tight",
          compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
        )}
      >
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
