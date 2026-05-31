import type { Artist, Track } from "../api/itunes";
import { fetchArtistTracks, fetchChartsTracks, fetchGenreTracks } from "../api/itunes";
import { dedupeTracks } from "./normalize";

export interface Genre {
  id: number;
  name: string;
}

// iTunes no filtra por idioma; usamos la tienda (store) de cada país como
// aproximación. Sesga al idioma local pero mezcla hits internacionales.
export interface Language {
  code: string;
  name: string;
  store: string;
  flag: string;
}

// IDs verificados contra los feeds RSS de iTunes.
export const GENRES: Genre[] = [
  { id: 14, name: "Pop" },
  { id: 21, name: "Rock" },
  { id: 18, name: "Hip-Hop/Rap" },
  { id: 20, name: "Alternativa" },
  { id: 17, name: "Dance" },
  { id: 7, name: "Electrónica" },
  { id: 15, name: "R&B/Soul" },
  { id: 6, name: "Country" },
  { id: 1153, name: "Metal" },
];

export const LANGUAGES: Language[] = [
  { code: "es", name: "Español", store: "es", flag: "🇪🇸" },
  { code: "en", name: "Inglés", store: "us", flag: "🇺🇸" },
  { code: "fr", name: "Francés", store: "fr", flag: "🇫🇷" },
  { code: "it", name: "Italiano", store: "it", flag: "🇮🇹" },
  { code: "pt", name: "Portugués", store: "br", flag: "🇧🇷" },
  { code: "de", name: "Alemán", store: "de", flag: "🇩🇪" },
  { code: "intl", name: "Internacional", store: "us", flag: "🌍" },
];

// Los géneros genéricos (Rock, Pop...) están dominados por música en inglés en
// TODAS las tiendas. Para "español" de verdad usamos los géneros latinos de iTunes.
const SPANISH_GENRE_IDS: Record<number, number> = {
  14: 1119, // Pop -> Pop Latino
  21: 1124, // Rock -> Alternativo & Rock Latino
};
const LATINO_GENRE_ID = 12; // "Latino": música en español en general

function resolveGenreId(genre: Genre, language: Language): number {
  if (language.code === "es") return SPANISH_GENRE_IDS[genre.id] ?? LATINO_GENRE_ID;
  return genre.id;
}

export type ChallengeSource =
  | { type: "artist"; artist: Artist }
  | { type: "artists"; artists: Artist[] }
  | { type: "genre"; genre: Genre; language: Language }
  | { type: "charts"; language: Language };

export function sourceLabel(s: ChallengeSource): string {
  switch (s.type) {
    case "artist":
      return s.artist.artistName;
    case "artists":
      return s.artists.map((a) => a.artistName).join(" + ");
    case "genre":
      return `${s.genre.name} · ${s.language.flag} ${s.language.name}`;
    case "charts":
      return `Top charts · ${s.language.flag} ${s.language.name}`;
  }
}

// Clave estable para récords en localStorage y semilla del modo diario.
export function sourceKey(s: ChallengeSource): string {
  switch (s.type) {
    case "artist":
      return `artist:${s.artist.artistId}`;
    case "artists":
      return `artists:${s.artists.map((a) => a.artistId).sort((a, b) => a - b).join("-")}`;
    case "genre":
      return `genre:${s.genre.id}:${s.language.code}`;
    case "charts":
      return `charts:${s.language.code}`;
  }
}

// True si el pool tiene varios artistas (habilita el modo "adivina el artista").
export function isMultiArtist(s: ChallengeSource): boolean {
  return s.type === "artists" || s.type === "genre" || s.type === "charts";
}

export async function loadSourceTracks(s: ChallengeSource): Promise<Track[]> {
  switch (s.type) {
    case "artist":
      return dedupeTracks(await fetchArtistTracks(s.artist.artistId));
    case "artists": {
      const lists = await Promise.all(s.artists.map((a) => fetchArtistTracks(a.artistId)));
      // Top N de cada artista e intercalado round-robin para que el pool quede
      // equilibrado (si no, los primeros del pool serían todos del 1er artista).
      const perArtist = lists.map((l) => dedupeTracks(l).slice(0, 40));
      const interleaved: Track[] = [];
      const maxLen = Math.max(0, ...perArtist.map((l) => l.length));
      for (let i = 0; i < maxLen; i++) {
        for (const l of perArtist) {
          if (l[i]) interleaved.push(l[i]);
        }
      }
      return dedupeTracks(interleaved);
    }
    case "genre":
      return dedupeTracks(await fetchGenreTracks(resolveGenreId(s.genre, s.language), s.language.store));
    case "charts":
      return dedupeTracks(await fetchChartsTracks(s.language.store));
  }
}
