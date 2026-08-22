"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

const Preloader = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 100);

    // Hide preloader after content loads
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        progress >= 100 ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Fire glow effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-accent/15 blur-[100px] animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      {/* Logo and flames */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Animated flames */}
        <div className="relative">
          <Flame className="w-20 h-20 text-primary animate-fire-flicker" />
          <Flame 
            className="absolute top-0 left-0 w-20 h-20 text-accent/50 animate-fire-flicker" 
            style={{ animationDelay: "0.2s", transform: "scale(1.1)" }} 
          />
          <Flame 
            className="absolute top-0 left-0 w-20 h-20 text-orange-400/30 animate-fire-flicker" 
            style={{ animationDelay: "0.4s", transform: "scale(1.2)" }} 
          />
        </div>

        {/* Brand name */}
        <h1 className="text-4xl font-display font-black tracking-tight">
          <span className="bg-gradient-to-r from-primary via-accent to-orange-400 bg-clip-text text-transparent">
            FORGE
          </span>
        </h1>

        {/* Progress bar */}
        <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-200 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* Loading text */}
        <p className="text-sm text-muted-foreground font-medium tracking-wider uppercase">
          Igniting Experience...
        </p>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/60 animate-float"
            style={{
              left: `${20 + i * 12}%`,
              bottom: "20%",
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + i * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Preloader;
