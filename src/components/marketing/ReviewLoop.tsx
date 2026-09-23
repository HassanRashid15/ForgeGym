"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Star, Quote } from "lucide-react";

export type ReviewItem = {
  name: string;
  role: string;
  rating: number;
  text: string;
  avatar: string;
  gymName?: string | null;
  gymLogoUrl?: string | null;
};

export interface ReviewLoopProps {
  reviews: ReviewItem[];
  speed?: number;
  direction?: 'left' | 'right';
  width?: number | string;
  cardWidth?: number;
  gap?: number;
  pauseOnHover?: boolean;
  hoverSpeed?: number;
  fadeOut?: boolean;
  fadeOutColor?: string;
  scaleOnHover?: boolean;
  renderItem?: (item: ReviewItem, key: React.Key) => React.ReactNode;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

const ANIMATION_CONFIG = {
  SMOOTH_TAU: 0.25,
  MIN_COPIES: 2,
  COPY_HEADROOM: 2
} as const;

const toCssLength = (value?: number | string): string | undefined =>
  typeof value === 'number' ? `${value}px` : (value ?? undefined);

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

const useResizeObserver = (
  callback: () => void,
  elements: Array<React.RefObject<Element | null>>,
  dependencies: React.DependencyList
) => {
  useEffect(() => {
    if (!window.ResizeObserver) {
      const handleResize = () => callback();
      window.addEventListener('resize', handleResize);
      callback();
      return () => window.removeEventListener('resize', handleResize);
    }

    const observers = elements.map(ref => {
      if (!ref.current) return null;
      const observer = new ResizeObserver(callback);
      observer.observe(ref.current);
      return observer;
    });

    callback();

    return () => {
      observers.forEach(observer => observer?.disconnect());
    };
  }, dependencies);
};

const useAnimationLoop = (
  trackRef: React.RefObject<HTMLDivElement | null>,
  targetVelocity: number,
  seqWidth: number,
  isHovered: boolean,
  hoverSpeed: number | undefined
) => {
  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (seqWidth > 0) {
      offsetRef.current = ((offsetRef.current % seqWidth) + seqWidth) % seqWidth;
      const transformValue = `translate3d(${-offsetRef.current}px, 0, 0)`;
      track.style.transform = transformValue;
    }

    if (prefersReduced) {
      track.style.transform = 'translate3d(0, 0, 0)';
      return () => {
        lastTimestampRef.current = null;
      };
    }

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }

      const deltaTime = Math.max(0, timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      const target = isHovered && hoverSpeed !== undefined ? hoverSpeed : targetVelocity;

      const easingFactor = 1 - Math.exp(-deltaTime / ANIMATION_CONFIG.SMOOTH_TAU);
      velocityRef.current += (target - velocityRef.current) * easingFactor;

      if (seqWidth > 0) {
        let nextOffset = offsetRef.current + velocityRef.current * deltaTime;
        nextOffset = ((nextOffset % seqWidth) + seqWidth) % seqWidth;
        offsetRef.current = nextOffset;

        const transformValue = `translate3d(${-offsetRef.current}px, 0, 0)`;
        track.style.transform = transformValue;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimestampRef.current = null;
    };
  }, [targetVelocity, seqWidth, isHovered, hoverSpeed]);
};

export const ReviewLoop = React.memo<ReviewLoopProps>(
  ({
    reviews,
    speed = 100,
    direction = 'left',
    width = '100%',
    cardWidth = 400,
    gap = 24,
    pauseOnHover,
    hoverSpeed,
    fadeOut = false,
    fadeOutColor,
    scaleOnHover = false,
    renderItem,
    ariaLabel = 'Customer reviews',
    className,
    style
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const seqRef = useRef<HTMLDivElement | null>(null);

    const [seqWidth, setSeqWidth] = useState<number>(0);
    const [copyCount, setCopyCount] = useState<number>(ANIMATION_CONFIG.MIN_COPIES);
    const [isHovered, setIsHovered] = useState<boolean>(false);

    const effectiveHoverSpeed = useMemo(() => {
      if (hoverSpeed !== undefined) return hoverSpeed;
      if (pauseOnHover === true) return 0;
      if (pauseOnHover === false) return undefined;
      return 0;
    }, [hoverSpeed, pauseOnHover]);

    const targetVelocity = useMemo(() => {
      const magnitude = Math.abs(speed);
      const directionMultiplier = direction === 'left' ? 1 : -1;
      const speedMultiplier = speed < 0 ? -1 : 1;
      return magnitude * directionMultiplier * speedMultiplier;
    }, [speed, direction]);

    const updateDimensions = useCallback(() => {
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      const sequenceRect = seqRef.current?.getBoundingClientRect?.();
      const sequenceWidth = sequenceRect?.width ?? 0;
      
      if (sequenceWidth > 0) {
        setSeqWidth(Math.ceil(sequenceWidth));
        const copiesNeeded = Math.ceil(containerWidth / sequenceWidth) + ANIMATION_CONFIG.COPY_HEADROOM;
        setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, copiesNeeded));
      }
    }, []);

    useResizeObserver(updateDimensions, [containerRef, seqRef], [reviews, gap, cardWidth]);
    useAnimationLoop(trackRef, targetVelocity, seqWidth, isHovered, effectiveHoverSpeed);

    const cssVariables = useMemo(
      () =>
        ({
          '--reviewloop-gap': `${gap}px`,
          '--reviewloop-cardWidth': `${cardWidth}px`,
          ...(fadeOutColor && { '--reviewloop-fadeColor': fadeOutColor })
        }) as React.CSSProperties,
      [gap, cardWidth, fadeOutColor]
    );

    const rootClasses = useMemo(
      () =>
        cx(
          'relative group overflow-x-hidden !bg-transparent',
          '[--reviewloop-gap:24px]',
          '[--reviewloop-cardWidth:400px]',
          '[--reviewloop-fadeColorAuto:#ffffff]',
          'dark:[--reviewloop-fadeColorAuto:#0b0b0b]',
          scaleOnHover && 'py-4',
          className
        ),
      [scaleOnHover, className]
    );

    const handleMouseEnter = useCallback(() => {
      if (effectiveHoverSpeed !== undefined) setIsHovered(true);
    }, [effectiveHoverSpeed]);
    const handleMouseLeave = useCallback(() => {
      if (effectiveHoverSpeed !== undefined) setIsHovered(false);
    }, [effectiveHoverSpeed]);

    const renderReviewItem = useCallback(
      (item: ReviewItem, key: React.Key) => {
        if (renderItem) {
          return (
            <div
              className={cx(
                'flex-none',
                'mr-[var(--reviewloop-gap)]',
                scaleOnHover && 'overflow-visible group/item'
              )}
              key={key}
              style={{ width: `var(--reviewloop-cardWidth)` }}
            >
              {renderItem(item, key)}
            </div>
          );
        }

        return (
          <div
            className={cx(
              'rounded-xl p-6 hover-lift flex flex-col border border-border/70',
              'mr-[var(--reviewloop-gap)]',
              scaleOnHover && 'transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/item:scale-105'
            )}
            key={key}
            style={{ width: `var(--reviewloop-cardWidth)`, background: 'transparent' }}
          >
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < item.rating
                      ? "fill-primary text-primary"
                      : "fill-none text-muted-foreground/45"
                  }`}
                />
              ))}
            </div>
            
            <div className="relative mb-6 flex-1">
              <Quote className="absolute -top-2 -left-2 h-8 w-8 text-primary/20" />
              <p className="text-sm leading-relaxed text-muted-foreground pl-6">
                {item.text}
              </p>
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {item.avatar}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{item.role}</p>
                </div>
              </div>

              {(item.gymName || item.gymLogoUrl) && (
                <div className="flex max-w-[42%] shrink-0 items-center gap-2 text-right">
                  <div className="min-w-0">
                    {item.gymName && (
                      <p className="truncate text-xs font-semibold text-foreground">
                        {item.gymName}
                      </p>
                    )}
                    <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                      Partner gym
                    </p>
                  </div>
                  {item.gymLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.gymLogoUrl}
                      alt={item.gymName || "Gym"}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-border/60"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-bold uppercase text-muted-foreground ring-1 ring-border/60">
                      {(item.gymName || "GY")
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      },
      [scaleOnHover, renderItem]
    );

    const reviewLists = useMemo(
      () =>
        Array.from({ length: copyCount }, (_, copyIndex) => (
          <div
            className="flex items-center"
            key={`copy-${copyIndex}`}
            ref={copyIndex === 0 ? seqRef : undefined}
          >
            {reviews.map((item, itemIndex) => renderReviewItem(item, `${copyIndex}-${itemIndex}`))}
          </div>
        )),
      [copyCount, reviews, renderReviewItem]
    );

    const containerStyle = useMemo(
      (): React.CSSProperties => ({
        width: toCssLength(width) ?? '100%',
        ...cssVariables,
        ...style
      }),
      [width, cssVariables, style]
    );

    return (
      <div ref={containerRef} className={rootClasses} style={containerStyle} role="region" aria-label={ariaLabel}>
        {fadeOut && (
          <>
            <div
              aria-hidden
              className={cx(
                'pointer-events-none absolute inset-y-0 left-0 z-10',
                'w-[clamp(24px,8%,120px)]',
                'bg-[linear-gradient(to_right,var(--reviewloop-fadeColor,var(--reviewloop-fadeColorAuto))_0%,rgba(0,0,0,0)_100%)]'
              )}
            />
            <div
              aria-hidden
              className={cx(
                'pointer-events-none absolute inset-y-0 right-0 z-10',
                'w-[clamp(24px,8%,120px)]',
                'bg-[linear-gradient(to_left,var(--reviewloop-fadeColor,var(--reviewloop-fadeColorAuto))_0%,rgba(0,0,0,0)_100%)]'
              )}
            />
          </>
        )}

        <div
          className={cx(
            'flex will-change-transform select-none relative z-0 w-max',
            'motion-reduce:transform-none'
          )}
          ref={trackRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {reviewLists}
        </div>
      </div>
    );
  }
);

ReviewLoop.displayName = 'ReviewLoop';

export default ReviewLoop;