export const DAILY_SNIPPETS = 6;

export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Hash determinista (FNV-1a) para elegir la canción del día.
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dailyIndex(dateStr: string, poolSize: number): number {
  if (poolSize <= 0) return 0;
  return hashStr(dateStr) % poolSize;
}

export interface DailyResult {
  date: string;
  won: boolean;
  solvedAt: number; // índice 0-based del intento en que se acertó, -1 si se falló
  grid: string;
}

const KEY_PREFIX = "echofan:daily:";

export function getDailyResult(dateStr: string): DailyResult | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + dateStr);
    return raw ? (JSON.parse(raw) as DailyResult) : null;
  } catch {
    return null;
  }
}

export function saveDailyResult(r: DailyResult): void {
  try {
    localStorage.setItem(KEY_PREFIX + r.date, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

export function buildGrid(solvedAt: number): string {
  const cells: string[] = [];
  for (let i = 0; i < DAILY_SNIPPETS; i++) {
    if (solvedAt < 0) cells.push("🟥");
    else if (i < solvedAt) cells.push("🟥");
    else if (i === solvedAt) cells.push("🟩");
    else cells.push("⬛");
  }
  return cells.join("");
}

export function shareText(r: DailyResult): string {
  const score = r.won ? `${r.solvedAt + 1}/${DAILY_SNIPPETS}` : `X/${DAILY_SNIPPETS}`;
  return `EchoFan diario ${r.date} ${score}\n${r.grid}`;
}
