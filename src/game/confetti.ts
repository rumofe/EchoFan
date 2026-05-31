import confetti from "canvas-confetti";

const NEON = ["#a855f7", "#22d3ee", "#ec4899", "#ffffff", "#ffcf5c"];

// Estallido rápido al acertar una canción.
export function celebrate(): void {
  confetti({
    particleCount: 70,
    spread: 72,
    startVelocity: 38,
    origin: { y: 0.7 },
    colors: NEON,
    scalar: 0.9,
    disableForReducedMotion: true,
  });
}

// Lluvia lateral más larga para victorias / récords.
export function bigCelebrate(): void {
  const end = Date.now() + 900;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 65, origin: { x: 0, y: 0.85 }, colors: NEON, disableForReducedMotion: true });
    confetti({ particleCount: 6, angle: 120, spread: 65, origin: { x: 1, y: 0.85 }, colors: NEON, disableForReducedMotion: true });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
