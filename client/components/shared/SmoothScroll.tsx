// client/components/SmoothScroll.tsx
"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.0,
      easing: (t: number) =>
        1 - Math.pow(1 - t, 4),

      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,

      // Better behavior for long SaaS pages
      syncTouch: true,
      autoRaf: false,
    });

    let rafId: number;

    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };

    rafId = requestAnimationFrame(raf);

    // Prevent Lenis from getting stuck when the tab
    // is hidden and then becomes visible again.
    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(raf);

        // Reset Lenis state after tab restoration
        lenis.resize();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    // Handle browser resize / layout changes
    const handleResize = () => {
      lenis.resize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener("resize", handleResize);

      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}

