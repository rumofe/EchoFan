export interface Artist {
  artistId: number;
  artistName: string;
  primaryGenreName?: string;
  artworkUrl?: string;
}

export interface Track {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  previewUrl: string;
  artworkUrl100?: string;
  trackTimeMillis?: number;
}

interface ItunesResponse<T> {
  resultCount: number;
  results: T[];
}

interface RawSongHit {
  wrapperType?: string;
  kind?: string;
  artistId?: number;
  artistName?: string;
  primaryGenreName?: string;
  artworkUrl100?: string;
  trackName?: string;
  trackId?: number;
  collectionName?: string;
  previewUrl?: string;
  trackTimeMillis?: number;
}

const BASE = "https://itunes.apple.com";

function upscaleArtwork(url: string | undefined, size = 300): string | undefined {
  if (!url) return undefined;
  return url.replace(/\/\d+x\d+(bb)?\./, `/${size}x${size}bb.`);
}

const COLLAB_SPLIT = /\s*(?:,|&| feat\.?| featuring | x | with | vs\.? )\s*/i;

function isCollabCredit(artistName: string, searchTerm: string): boolean {
  const parts = artistName
    .split(COLLAB_SPLIT)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (parts.length <= 1) return false;

  const term = searchTerm.trim().toLowerCase();
  const whole = artistName.trim().toLowerCase();
  if (whole === term) return false;

  if (parts.length >= 3) return true;
  if (/,/.test(artistName)) return true;
  if (/\s(feat\.?|featuring|with|vs\.?|x)\s/i.test(artistName)) return true;

  return parts.some((p) => p === term || p.includes(term));
}

export async function searchArtists(term: string): Promise<Artist[]> {
  // Búsqueda híbrida: 'musicArtist' devuelve entidades de artista reales (incluido
  // el artista en solitario, no solo colaboraciones); la búsqueda de canciones se
  // usa solo para sacar la carátula representativa por artistId.
  const artistUrl = `${BASE}/search?term=${encodeURIComponent(term)}&entity=musicArtist&limit=20`;
  const songUrl = `${BASE}/search?term=${encodeURIComponent(term)}&entity=song&attribute=artistTerm&limit=50`;
  const [artistRes, songRes] = await Promise.all([fetch(artistUrl), fetch(songUrl)]);
  const artistData: ItunesResponse<RawSongHit> = await artistRes.json();
  const songData: ItunesResponse<RawSongHit> = await songRes.json();

  // Carátula por artistId desde la búsqueda de canciones.
  const artBy = new Map<number, string | undefined>();
  for (const r of songData.results) {
    if (r.artistId && r.artworkUrl100 && !artBy.has(r.artistId)) {
      artBy.set(r.artistId, upscaleArtwork(r.artworkUrl100, 120));
    }
  }

  const all: Artist[] = [];
  const seen = new Set<number>();
  for (const r of artistData.results) {
    if (!r.artistId || !r.artistName || seen.has(r.artistId)) continue;
    seen.add(r.artistId);
    all.push({
      artistId: r.artistId,
      artistName: r.artistName,
      primaryGenreName: r.primaryGenreName,
      artworkUrl: artBy.get(r.artistId),
    });
  }

  // Oculta colaboraciones, pero si eso vaciara la lista, las mostramos igualmente.
  const filtered = all.filter((a) => !isCollabCredit(a.artistName, term));
  return (filtered.length ? filtered : all).slice(0, 10);
}

export async function fetchArtistTracks(artistId: number, limit = 200): Promise<Track[]> {
  const url = `${BASE}/lookup?id=${artistId}&entity=song&limit=${limit}`;
  const res = await fetch(url);
  const data: ItunesResponse<RawSongHit> = await res.json();
  return data.results
    .filter(
      (r): r is Required<Pick<RawSongHit, "trackId" | "trackName" | "artistName" | "collectionName" | "previewUrl">> & RawSongHit =>
        r.wrapperType === "track" &&
        r.kind === "song" &&
        !!r.previewUrl &&
        !!r.trackName &&
        !!r.trackId &&
        !!r.artistName &&
        !!r.collectionName,
    )
    .map((r) => ({
      trackId: r.trackId,
      trackName: r.trackName,
      artistName: r.artistName,
      collectionName: r.collectionName,
      previewUrl: r.previewUrl,
      artworkUrl100: upscaleArtwork(r.artworkUrl100, 200),
      trackTimeMillis: r.trackTimeMillis,
    }));
}

// --- RSS feeds (top charts, opcionalmente filtrados por género) ---
// Estos feeds traen la previewUrl directamente, sin un segundo lookup.

interface RssLabel {
  label: string;
}

interface RssImage {
  label: string;
  attributes: { height: string };
}

interface RssLink {
  attributes: {
    href: string;
    "im:assetType"?: string;
    rel?: string;
  };
}

interface RssEntry {
  "im:name": RssLabel;
  "im:artist": RssLabel;
  "im:image"?: RssImage[];
  "im:collection"?: { "im:name": RssLabel };
  link: RssLink | RssLink[];
  id: { attributes: { "im:id": string } };
}

interface RssFeed {
  feed: { entry?: RssEntry[] };
}

function rssEntryToTrack(entry: RssEntry): Track | null {
  const links = Array.isArray(entry.link) ? entry.link : [entry.link];
  const preview = links.find((l) => l.attributes["im:assetType"] === "preview");
  if (!preview) return null;
  const trackId = Number.parseInt(entry.id.attributes["im:id"], 10);
  if (!Number.isFinite(trackId)) return null;
  const images = entry["im:image"] ?? [];
  const biggest = images[images.length - 1]?.label;
  return {
    trackId,
    trackName: entry["im:name"].label,
    artistName: entry["im:artist"].label,
    collectionName: entry["im:collection"]?.["im:name"].label ?? "",
    previewUrl: preview.attributes.href,
    artworkUrl100: upscaleArtwork(biggest, 200),
  };
}

async function fetchRssTracks(path: string): Promise<Track[]> {
  const res = await fetch(`${BASE}${path}`);
  const data: RssFeed = await res.json();
  const entries = data.feed.entry ?? [];
  const tracks: Track[] = [];
  for (const e of entries) {
    const t = rssEntryToTrack(e);
    if (t) tracks.push(t);
  }
  return tracks;
}

export function fetchGenreTracks(genreId: number, country: string, limit = 100): Promise<Track[]> {
  return fetchRssTracks(`/${country}/rss/topsongs/limit=${limit}/genre=${genreId}/json`);
}

export function fetchChartsTracks(country: string, limit = 100): Promise<Track[]> {
  return fetchRssTracks(`/${country}/rss/topsongs/limit=${limit}/json`);
}
