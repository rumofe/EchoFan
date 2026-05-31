import type { Difficulty } from "./difficulty";

const KEY = "echofan:best-scores:v2";

export interface BestScore {
  score: number;
  date: string;
}

type Store = Record<string, BestScore>;

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function save(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* ignore quota errors */
  }
}

function makeKey(sourceKey: string, difficulty: Difficulty, modeKey: string): string {
  return `${sourceKey}|${difficulty}|${modeKey}`;
}

export function getBest(sourceKey: string, difficulty: Difficulty, modeKey: string): BestScore | null {
  const store = load();
  return store[makeKey(sourceKey, difficulty, modeKey)] ?? null;
}

export function recordResult(
  sourceKey: string,
  difficulty: Difficulty,
  modeKey: string,
  score: number,
): { best: BestScore; isNewRecord: boolean } {
  const store = load();
  const key = makeKey(sourceKey, difficulty, modeKey);
  const prev = store[key];
  const beatsPrev = prev ? score > prev.score : score > 0;
  if (!prev || score > prev.score) {
    const result: BestScore = { score, date: new Date().toISOString() };
    store[key] = result;
    save(store);
    return { best: result, isNewRecord: beatsPrev };
  }
  return { best: prev, isNewRecord: false };
}
