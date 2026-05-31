import type { Track } from "../api/itunes";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Fácil (top 25)",
  medium: "Medio (top 50, sesgo a hits)",
  hard: "Difícil (todo, sesgo a rarezas)",
};

export interface DifficultyConfig {
  poolSize: number;
  weight: (rankFromTop: number, poolSize: number) => number;
}

const CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    poolSize: 25,
    weight: () => 1,
  },
  medium: {
    poolSize: 50,
    weight: (rank, n) => {
      const top = Math.floor(n / 2);
      return rank < top ? 2 : 1;
    },
  },
  hard: {
    poolSize: Infinity,
    weight: (rank, n) => {
      const bottomStart = Math.floor(n / 2);
      return rank >= bottomStart ? 2 : 1;
    },
  },
};

export function buildPool(tracks: Track[], difficulty: Difficulty): { track: Track; weight: number }[] {
  const cfg = CONFIGS[difficulty];
  const pool = tracks.slice(0, Math.min(cfg.poolSize, tracks.length));
  return pool.map((track, i) => ({ track, weight: cfg.weight(i, pool.length) }));
}

export function pickWeighted<T>(items: { track: T; weight: number }[], exclude: Set<number>, getId: (t: T) => number): T | null {
  const available = items.filter((i) => !exclude.has(getId(i.track)));
  if (!available.length) return null;
  const total = available.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const i of available) {
    r -= i.weight;
    if (r <= 0) return i.track;
  }
  return available[available.length - 1].track;
}
