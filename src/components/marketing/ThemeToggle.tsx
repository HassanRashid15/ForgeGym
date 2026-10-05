"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

type DocWithViewTransition = Document & {
  startViewTransition?: (update: () => void) => { ready: Promise<void> };
};

const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const next = isDark ? "light" : "dark";
    const apply = () => setTheme(next);

    const doc = document as DocWithViewTransition;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduceMotion) {
      apply();
      return;
    }

    // Circular reveal: the new theme expands from the toggle button.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    const transition = doc.startViewTransition(apply);
    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 550,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {
        /* transition skipped (e.g. rapid clicks): theme is already applied */
      });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={`relative ${isHomePage ? "hover:bg-white/10" : "hover:bg-black/10"}`}
      aria-label={mounted && isDark ? "Switch to light" : "Switch to dark"}
      title={mounted && isDark ? "Switch to light" : "Switch to dark"}
    >
      {mounted ? (
        <span
          key={isDark ? "sun" : "moon"}
          className="theme-icon-pop flex items-center justify-center"
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-yellow-300" aria-hidden />
          ) : (
            <Moon
              className={`h-5 w-5 ${isHomePage ? "text-white" : "text-foreground"}`}
              aria-hidden
            />
          )}
        </span>
      ) : (
        <span className="h-5 w-5" aria-hidden />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

export default ThemeToggle;
