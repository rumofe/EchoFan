const NOISE_PATTERNS = [
  /\(.*?(remaster|remastered|remix|live|mono|stereo|version|edit|deluxe|bonus|acoustic|demo|radio|extended|instrumental).*?\)/gi,
  /\[.*?(remaster|remastered|remix|live|mono|stereo|version|edit|deluxe|bonus|acoustic|demo|radio|extended|instrumental).*?\]/gi,
  /\s-\s.*(remaster|remastered|remix|live|mono|stereo|version|edit|deluxe|bonus|acoustic|demo|radio|extended|instrumental).*/gi,
  /\(feat\.?[^)]*\)/gi,
  /\[feat\.?[^\]]*\]/gi,
  /\sfeat\.?\s.*$/gi,
  /\(with[^)]*\)/gi,
];

export function normalizeTitle(raw: string): string {
  let s = raw.toLowerCase();
  for (const re of NOISE_PATTERNS) s = s.replace(re, "");
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/[^\p{L}\p{N}\s]/gu, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, dp[i], dp[i - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[a.length];
}

export function titlesMatch(guess: string, actual: string): boolean {
  const g = normalizeTitle(guess);
  const a = normalizeTitle(actual);
  if (!g || !a) return false;
  if (g === a) return true;
  const maxLen = Math.max(g.length, a.length);
  const dist = levenshtein(g, a);
  const threshold = maxLen <= 6 ? 1 : maxLen <= 12 ? 2 : 3;
  return dist <= threshold;
}

export function dedupeTracks<T extends { trackName: string; trackId: number }>(tracks: T[]): T[] {
  const seenTitles = new Set<string>();
  const seenIds = new Set<number>();
  const out: T[] = [];
  for (const t of tracks) {
    const key = normalizeTitle(t.trackName);
    if (!key || seenTitles.has(key) || seenIds.has(t.trackId)) continue;
    seenTitles.add(key);
    seenIds.add(t.trackId);
    out.push(t);
  }
  return out;
}
