import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeTitle } from "../game/normalize";

export interface Suggestion {
  id: string | number;
  label: string;
  sublabel?: string;
  image?: string;
  keywords?: string; // texto extra buscable (p.ej. el artista) que no se inserta
}

interface Props {
  suggestions: Suggestion[];
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function GuessInput({ suggestions, value, onChange, onSubmit, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const normalized = useMemo(
    () =>
      suggestions.map((s) => ({
        item: s,
        title: normalizeTitle(s.label),
        extra: normalizeTitle(s.keywords ?? ""),
      })),
    [suggestions],
  );

  const matches = useMemo(() => {
    const q = normalizeTitle(value);
    if (!q) return [];
    const wordStarts = (s: string) => s.split(" ").some((w) => w.startsWith(q));
    const scored: { item: Suggestion; score: number }[] = [];
    for (const { item, title, extra } of normalized) {
      let score = Infinity;
      if (title.startsWith(q)) score = 0;
      else if (wordStarts(title)) score = 1;
      else if (title.includes(q)) score = 2;
      else if (extra.startsWith(q) || wordStarts(extra)) score = 3;
      else if (extra.includes(q)) score = 4;
      if (score < Infinity) scored.push({ item, score });
    }
    scored.sort((a, b) => a.score - b.score); // sort estable: respeta orden previo en empates
    return scored.slice(0, 8).map((s) => s.item);
  }, [normalized, value]);

  useEffect(() => {
    setHighlight(0);
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function choose(s: Suggestion) {
    onChange(s.label);
    setOpen(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && matches[highlight]) {
        e.preventDefault();
        choose(matches[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="guess-input" ref={wrapRef}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setOpen(false);
          onSubmit();
        }}
      >
        <input
          type="text"
          placeholder={placeholder ?? "Escribe tu respuesta..."}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          disabled={disabled}
          autoFocus
        />
        <button type="submit" disabled={disabled}>Adivinar</button>
      </form>
      {open && matches.length > 0 && (
        <ul className="suggestions">
          {matches.map((s, i) => (
            <li
              key={`${s.id}-${i}`}
              className={i === highlight ? "active" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              {s.image ? (
                <img className="suggestion-art" src={s.image} alt="" loading="lazy" />
              ) : (
                <span className="suggestion-art placeholder" />
              )}
              <span className="suggestion-info">
                <span className="suggestion-title">{s.label}</span>
                {s.sublabel && <span className="suggestion-album">{s.sublabel}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
