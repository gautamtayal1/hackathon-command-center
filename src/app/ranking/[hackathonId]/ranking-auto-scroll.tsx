"use client";

import { useEffect } from "react";

const SCROLL_SPEED_PX_PER_SECOND = 32;
const EDGE_PAUSE_MS = 1800;
const MANUAL_PAUSE_MS = 4000;

export function RankingAutoScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    if (reducedMotion.matches) {
      return;
    }

    let direction = 1;
    let previousTime = performance.now();
    let pauseUntil = previousTime + EDGE_PAUSE_MS;
    let animationFrame = 0;
    let scrollPosition = window.scrollY;

    const pauseForManualInteraction = () => {
      pauseUntil = performance.now() + MANUAL_PAUSE_MS;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        ["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "].includes(
          event.key,
        )
      ) {
        pauseForManualInteraction();
      }
    };

    const tick = (time: number) => {
      const elapsedSeconds = Math.min((time - previousTime) / 1000, 0.1);
      previousTime = time;

      if (time < pauseUntil || document.hidden) {
        scrollPosition = window.scrollY;
      } else {
        const maxScroll = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight,
        );

        if (maxScroll > 0) {
          const nextPosition =
            scrollPosition +
            direction * SCROLL_SPEED_PX_PER_SECOND * elapsedSeconds;

          if (nextPosition >= maxScroll) {
            scrollPosition = maxScroll;
            window.scrollTo({ top: scrollPosition, behavior: "auto" });
            direction = -1;
            pauseUntil = time + EDGE_PAUSE_MS;
          } else if (nextPosition <= 0) {
            scrollPosition = 0;
            window.scrollTo({ top: scrollPosition, behavior: "auto" });
            direction = 1;
            pauseUntil = time + EDGE_PAUSE_MS;
          } else {
            scrollPosition = nextPosition;
            window.scrollTo({ top: scrollPosition, behavior: "auto" });
          }
        }
      }

      animationFrame = window.requestAnimationFrame(tick);
    };

    window.addEventListener("wheel", pauseForManualInteraction, {
      passive: true,
    });
    window.addEventListener("touchstart", pauseForManualInteraction, {
      passive: true,
    });
    window.addEventListener("pointerdown", pauseForManualInteraction, {
      passive: true,
    });
    window.addEventListener("keydown", handleKeyDown);
    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("wheel", pauseForManualInteraction);
      window.removeEventListener("touchstart", pauseForManualInteraction);
      window.removeEventListener("pointerdown", pauseForManualInteraction);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}
