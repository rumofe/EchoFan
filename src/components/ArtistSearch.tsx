import { useEffect, useState } from "react";
import { searchArtists, type Artist } from "../api/itunes";

interface Props {
  onPick: (artist: Artist) => void;
}

export function ArtistSearch({ onPick }: Props) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const artists = await searchArtists(term.trim());
        setResults(artists);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [term]);

  return (
    <div className="artist-search">
      <input
        type="text"
        placeholder="Busca un artista..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        autoFocus
      />
      {loading && <p className="hint">Buscando...</p>}
      <ul className="artist-list">
        {results.map((a) => (
          <li key={a.artistId}>
            <button onClick={() => onPick(a)}>
              {a.artworkUrl ? (
                <img className="artist-art" src={a.artworkUrl} alt="" loading="lazy" />
              ) : (
                <span className="artist-art placeholder">{a.artistName.charAt(0)}</span>
              )}
              <span className="artist-info">
                <span className="artist-name">{a.artistName}</span>
                {a.primaryGenreName && <span className="artist-genre">{a.primaryGenreName}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
