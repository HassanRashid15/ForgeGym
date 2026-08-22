"use client";

import { useEffect, useRef, useState } from "react";

interface TypingTextProps {
  phrases: string[];
  className?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseMs?: number;
  loop?: boolean;
}

/**
 * Smooth cycling typewriter effect with steady blinking caret.
 * Uses a ref-driven scheduler so timers aren't torn down on every keystroke,
 * which eliminates the flicker/jitter from a state-driven setTimeout loop.
 */
const TypingText = ({
  phrases,
  className = "",
  typingSpeed = 65,
  deletingSpeed = 35,
  pauseMs = 1500,
  loop = true,
}: TypingTextProps) => {
  const [text, setText] = useState("");
  const stateRef = useRef({ index: 0, deleting: false, text: "" });

  useEffect(() => {
    if (!phrases.length) return;
    let timer: number;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const s = stateRef.current;
      const current = phrases[s.index % phrases.length];

      if (!s.deleting && s.text === current) {
        if (!loop && s.index === phrases.length - 1) return;
        timer = window.setTimeout(() => {
          s.deleting = true;
          tick();
        }, pauseMs);
        return;
      }
      if (s.deleting && s.text === "") {
        s.deleting = false;
        s.index = (s.index + 1) % phrases.length;
        timer = window.setTimeout(tick, 220);
        return;
      }

      s.text = s.deleting
        ? current.slice(0, s.text.length - 1)
        : current.slice(0, s.text.length + 1);
      setText(s.text);
      timer = window.setTimeout(tick, s.deleting ? deletingSpeed : typingSpeed);
    };

    tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [phrases, typingSpeed, deletingSpeed, pauseMs, loop]);

  return (
    <span className={className}>
      <span aria-live="polite">{text}</span>
      <span
        aria-hidden
        className="ml-1 inline-block w-[0.08em] h-[0.9em] align-[-0.1em] bg-primary animate-caret-blink"
      />
    </span>
  );
};

export default TypingText;
