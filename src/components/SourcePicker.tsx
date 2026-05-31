import { useState } from "react";
import { motion } from "framer-motion";
import type { Artist } from "../api/itunes";
import { ArtistSearch } from "./ArtistSearch";
import type { GuessTarget } from "../game/mode";
import {
  type ChallengeSource,
  GENRES,
  LANGUAGES,
  type Genre,
  type Language,
} from "../game/source";

type SourceType = "artist" | "artists" | "genre" | "charts";

const TYPE_LABELS: Record<SourceType, { title: string; desc: string; icon: string }> = {
  artist: { title: "Artista", desc: "Canciones de un solo artista o grupo", icon: "🎤" },
  artists: { title: "Mezcla de artistas", desc: "Combina 2-3 artistas en un reto", icon: "🎭" },
  genre: { title: "Género + idioma", desc: "Lo más sonado de un género por idioma", icon: "🎸" },
  charts: { title: "Top charts", desc: "Los hits del momento por idioma", icon: "🔥" },
};

interface Props {
  onStart: (source: ChallengeSource, guessTarget: GuessTarget) => void;
}

const MULTI_ARTIST: SourceType[] = ["artists", "genre", "charts"];

export function SourcePicker({ onStart }: Props) {
  const [type, setType] = useState<SourceType>("artist");
  const [artist, setArtist] = useState<Artist | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [genre, setGenre] = useState<Genre>(GENRES[1]); // Rock
  const [language, setLanguage] = useState<Language>(LANGUAGES[0]); // Español
  const [guessTarget, setGuessTarget] = useState<GuessTarget>("track");

  const multiArtist = MULTI_ARTIST.includes(type);

  function addArtist(a: Artist) {
    if (artists.some((x) => x.artistId === a.artistId)) return;
    if (artists.length >= 3) return;
    setArtists([...artists, a]);
  }

  function removeArtist(id: number) {
    setArtists(artists.filter((a) => a.artistId !== id));
  }

  function canStart(): boolean {
    if (type === "artist") return !!artist;
    if (type === "artists") return artists.length >= 2;
    return true;
  }

  function start() {
    const target: GuessTarget = multiArtist ? guessTarget : "track";
    if (type === "artist" && artist) onStart({ type: "artist", artist }, target);
    else if (type === "artists" && artists.length >= 2) onStart({ type: "artists", artists }, target);
    else if (type === "genre") onStart({ type: "genre", genre, language }, target);
    else if (type === "charts") onStart({ type: "charts", language }, target);
  }

  return (
    <div className="source-picker">
      <div className="source-types">
        {(Object.keys(TYPE_LABELS) as SourceType[]).map((t, i) => (
          <motion.button
            key={t}
            className={"source-card " + (t === type ? "selected" : "")}
            onClick={() => setType(t)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: "easeOut" }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="source-icon">{TYPE_LABELS[t].icon}</span>
            <span className="source-title">{TYPE_LABELS[t].title}</span>
            <span className="source-desc">{TYPE_LABELS[t].desc}</span>
          </motion.button>
        ))}
      </div>

      <div className="source-config">
        {type === "artist" && (
          <>
            {artist ? (
              <div className="picked-artists">
                <span className="picked-chip">
                  {artist.artistName}
                  <button onClick={() => setArtist(null)}>✕</button>
                </span>
              </div>
            ) : (
              <ArtistSearch onPick={setArtist} />
            )}
          </>
        )}

        {type === "artists" && (
          <>
            {artists.length > 0 && (
              <div className="picked-artists">
                {artists.map((a) => (
                  <span key={a.artistId} className="picked-chip">
                    {a.artistName}
                    <button onClick={() => removeArtist(a.artistId)}>✕</button>
                  </span>
                ))}
              </div>
            )}
            {artists.length < 3 && <ArtistSearch onPick={addArtist} />}
            <p className="hint">Añade entre 2 y 3 artistas.</p>
          </>
        )}

        {type === "genre" && (
          <>
            <div className="setting">
              <label>Género</label>
              <div className="chip-row">
                {GENRES.map((g) => (
                  <button
                    key={g.id}
                    className={g.id === genre.id ? "selected" : ""}
                    onClick={() => setGenre(g)}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
            <LanguagePicker language={language} onChange={setLanguage} />
          </>
        )}

        {type === "charts" && <LanguagePicker language={language} onChange={setLanguage} />}

        {multiArtist && (
          <div className="setting">
            <label>¿Qué adivinas?</label>
            <div className="chip-row">
              <button
                className={guessTarget === "track" ? "selected" : ""}
                onClick={() => setGuessTarget("track")}
              >
                🎵 La canción
              </button>
              <button
                className={guessTarget === "artist" ? "selected" : ""}
                onClick={() => setGuessTarget("artist")}
              >
                🎤 El artista
              </button>
            </div>
          </div>
        )}
      </div>

      <button className="big start-btn" disabled={!canStart()} onClick={start}>
        Jugar
      </button>
    </div>
  );
}

function LanguagePicker({ language, onChange }: { language: Language; onChange: (l: Language) => void }) {
  return (
    <div className="setting">
      <label>Idioma</label>
      <div className="chip-row">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            className={l.code === language.code ? "selected" : ""}
            onClick={() => onChange(l)}
          >
            {l.flag} {l.name}
          </button>
        ))}
      </div>
      <p className="hint">Aproximado: usa la tienda de ese idioma, mezcla algún hit internacional.</p>
    </div>
  );
}
