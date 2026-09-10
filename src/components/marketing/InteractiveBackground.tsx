"use client";

import { useEffect, useRef, useState } from "react";

interface InteractiveBackgroundProps {
  variant?: "particles" | "gradient" | "auto";
  className?: string;
  density?: number;
  colorHsl?: string;
}

/**
 * Optimized animated background that subtly reacts to the pointer.
 *
 * Performance strategy:
 * - "auto" picks gradient on low-power devices (few cores, low DPR, small mem,
 *   coarse pointer, reduced-motion, save-data) and particles elsewhere.
 * - Runtime FPS monitor auto-downgrades particles → gradient if it dips below
 *   ~40fps for a sustained window.
 * - Canvas is DPR-capped at 1.5, density scales with area, connecting lines
 *   use a spatial grid (O(n) neighbor lookup instead of O(n²)).
 * - Pointer events are throttled to the animation frame; RAF pauses when
 *   the tab is hidden or the element is off-screen (IntersectionObserver).
 */
const InteractiveBackground = ({
  variant = "auto",
  className = "",
  density = 60,
  colorHsl,
}: InteractiveBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradientRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -9999, y: -9999, active: false, dirty: false });
  const rafRef = useRef<number>();

  // Detect a "low power" device once
  const [mode, setMode] = useState<"particles" | "gradient">("gradient");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (variant === "particles") {
      setMode("particles");
      return;
    }
    if (variant === "gradient") {
      setMode("gradient");
      return;
    }
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const lowCores = (navigator.hardwareConcurrency || 4) <= 4;
    const lowMem = (nav.deviceMemory ?? 8) <= 4;
    const saveData = !!nav.connection?.saveData;
    const slowNet = /2g/.test(nav.connection?.effectiveType || "");
    if (reduced || saveData || slowNet) {
      setMode("gradient");
      return;
    }
    if (coarse && (lowCores || lowMem)) {
      setMode("gradient");
      return;
    }
    setMode("particles");
  }, [variant]);

  const getColor = () => {
    if (colorHsl) return colorHsl;
    if (typeof window === "undefined") return "0 95% 55%";
    const val = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim();
    return val || "0 95% 55%";
  };

  // Pointer tracking (shared by both variants)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      mouse.current.active = true;
      mouse.current.dirty = true;
    };
    const onLeave = () => {
      mouse.current.active = false;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Gradient variant: batch pointer updates into RAF
  useEffect(() => {
    if (mode !== "gradient") return;
    const el = gradientRef.current;
    if (!el) return;
    let raf = 0;
    const tick = () => {
      if (mouse.current.dirty) {
        el.style.setProperty("--mx", `${mouse.current.x}px`);
        el.style.setProperty("--my", `${mouse.current.y}px`);
        mouse.current.dirty = false;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode]);

  // Particles variant
  useEffect(() => {
    if (mode !== "particles") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    // Density scales with area, capped for perf
    const area = width * height;
    const target = Math.round((area / (1280 * 720)) * density);
    const count = Math.max(18, Math.min(target, 90));

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.6 + 0.6,
    }));

    const color = getColor();
    const LINK = 110;
    const LINK2 = LINK * LINK;
    const CELL = LINK;

    let visible = true;
    let onScreen = true;
    const onVis = () => (visible = !document.hidden);
    document.addEventListener("visibilitychange", onVis);

    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    // FPS monitor for auto-downgrade
    let frames = 0;
    let fpsWindowStart = performance.now();
    let slowWindows = 0;

    const rect = () => canvas.getBoundingClientRect();

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (!visible || !onScreen) return;

      // FPS sampling
      frames++;
      const now = performance.now();
      if (now - fpsWindowStart >= 1000) {
        const fps = (frames * 1000) / (now - fpsWindowStart);
        frames = 0;
        fpsWindowStart = now;
        if (fps < 40) slowWindows++;
        else slowWindows = Math.max(0, slowWindows - 1);
        if (slowWindows >= 3) {
          // Sustained low FPS → downgrade to gradient
          setMode("gradient");
          return;
        }
      }

      ctx.clearRect(0, 0, width, height);

      const bounds = rect();
      const mxLocal = mouse.current.x - bounds.left;
      const myLocal = mouse.current.y - bounds.top;
      const mouseInside =
        mouse.current.active &&
        mxLocal >= 0 &&
        myLocal >= 0 &&
        mxLocal <= width &&
        myLocal <= height;

      // Spatial hash for O(n) neighbor lookup
      const cols = Math.max(1, Math.ceil(width / CELL));
      const rows = Math.max(1, Math.ceil(height / CELL));
      const grid: number[][] = new Array(cols * rows);

      ctx.fillStyle = `hsla(${color} / 0.85)`;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        if (mouseInside) {
          const dx = mxLocal - p.x;
          const dy = myLocal - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 140 * 140) {
            const d = Math.sqrt(d2) + 0.01;
            const f = (1 - d / 140) * 0.5;
            p.x += (dx / d) * f;
            p.y += (dy / d) * f;
          }
        }

        const cx = Math.min(cols - 1, Math.max(0, (p.x / CELL) | 0));
        const cy = Math.min(rows - 1, Math.max(0, (p.y / CELL) | 0));
        const key = cy * cols + cx;
        (grid[key] || (grid[key] = [])).push(i);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw lines only within neighboring cells
      ctx.lineWidth = 0.6;
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const cell = grid[cy * cols + cx];
          if (!cell) continue;
          for (let ny = cy; ny <= cy + 1 && ny < rows; ny++) {
            for (let nx = cx - 1; nx <= cx + 1 && nx < cols; nx++) {
              if (nx < 0) continue;
              if (ny === cy && nx < cx) continue;
              const other = grid[ny * cols + nx];
              if (!other) continue;
              for (let ii = 0; ii < cell.length; ii++) {
                const a = particles[cell[ii]];
                for (let jj = 0; jj < other.length; jj++) {
                  if (other === cell && jj <= ii) continue;
                  const b = particles[other[jj]];
                  const dx = a.x - b.x;
                  const dy = a.y - b.y;
                  const d2 = dx * dx + dy * dy;
                  if (d2 < LINK2) {
                    const alpha = (1 - Math.sqrt(d2) / LINK) * 0.22;
                    ctx.strokeStyle = `hsla(${color} / ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                  }
                }
              }
            }
          }
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mode, density, colorHsl]);

  if (mode === "gradient") {
    return (
      <div
        ref={gradientRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
        style={{
          background: `
            radial-gradient(600px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--primary) / 0.25), transparent 60%),
            radial-gradient(800px circle at 80% 20%, hsl(var(--accent) / 0.15), transparent 60%),
            radial-gradient(700px circle at 10% 90%, hsl(var(--primary) / 0.12), transparent 60%)
          `,
          willChange: "background",
        }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      suppressHydrationWarning
    />
  );
};

export default InteractiveBackground;
