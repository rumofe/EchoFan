import { useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import type { Track } from "../api/itunes";
import { titlesMatch } from "../game/normalize";
import { loadSourceTracks, LANGUAGES } from "../game/source";
import {
  DAILY_SNIPPETS,
  todayStr,
  dailyIndex,
  getDailyResult,
  saveDailyResult,
  buildGrid,
  shareText,
  type DailyResult,
} from "../game/daily";
import { playCorrect, playReveal, playWrong, playFanfare } from "../game/sounds";
import { celebrate, bigCelebrate } from "../game/confetti";
import { GuessInput, type Suggestion } from "./GuessInput";

const SNIPPET_MS = [1000, 2000, 4000, 8000, 16000, 30000];

interface Props {
  onBack: () => void;
}

type Phase = "loading" | "playing" | "done" | "empty";

// El reto diario usa los top charts internacionales: misma lista para todos hoy.
const DAILY_SOURCE = { type: "charts" as const, language: LANGUAGES[LANGUAGES.length - 1] };

export function DailyGame({ onBack }: Props) {
  const date = useMemo(() => todayStr(), []);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pool, setPool] = useState<Track[]>([]);
  const [song, setSong] = useState<Track | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [guess, setGuess] = useState("");
  const [history, setHistory] = useState<{ guess: string; correct: boolean }[]>([]);
  const [result, setResult] = useState<DailyResult | null>(null);
  const [playingProgress, setPlayingProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const progressRafRef = useRef<number | null>(null);

  useEffect(() => {
    const existing = getDailyResult(date);
    let cancelled = false;
    (async () => {
      try {
        const tracks = await loadSourceTracks(DAILY_SOURCE);
        if (cancelled) return;
        if (tracks.length === 0) {
          setPhase("empty");
          return;
        }
        setPool(tracks);
        setSong(tracks[dailyIndex(date, tracks.length)]);
        if (existing) {
          setResult(existing);
          setPhase("done");
        } else {
          setPhase("playing");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error cargando el reto diario");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  function stopAudio() {
    if (stopTimerRef.current !== null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (progressRafRef.current !== null) {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
    if (audioRef.current) audioRef.current.pause();
    setPlayingProgress(0);
  }

  useEffect(() => () => stopAudio(), []);

  function playSnippet() {
    if (!song || !audioRef.current) return;
    stopAudio();
    const audio = audioRef.current;
    const durationMs = SNIPPET_MS[attempt];
    audio.currentTime = 0;
    const begin = performance.now();
    const tick = () => {
      const elapsed = performance.now() - begin;
      setPlayingProgress(Math.min(1, elapsed / durationMs));
      if (elapsed < durationMs) progressRafRef.current = requestAnimationFrame(tick);
    };
    const onCanPlay = () => {
      audio.play().catch(() => {});
      progressRafRef.current = requestAnimationFrame(tick);
    };
    if (audio.readyState >= 2) onCanPlay();
    else audio.addEventListener("canplay", onCanPlay, { once: true });
    stopTimerRef.current = window.setTimeout(() => {
      audio.pause();
      setPlayingProgress(1);
    }, durationMs);
  }

  function finish(won: boolean, solvedAt: number) {
    stopAudio();
    const r: DailyResult = { date, won, solvedAt, grid: buildGrid(won ? solvedAt : -1) };
    saveDailyResult(r);
    setResult(r);
    setPhase("done");
    if (won) {
      playFanfare();
      bigCelebrate();
    } else {
      playReveal();
    }
  }

  function submitGuess() {
    if (!song || !guess.trim()) return;
    const correct = titlesMatch(guess, song.trackName);
    setHistory((h) => [...h, { guess: guess.trim(), correct }]);
    setGuess("");
    if (correct) {
      playCorrect();
      celebrate();
      finish(true, attempt);
      return;
    }
    playWrong();
    const next = attempt + 1;
    if (next >= DAILY_SNIPPETS) finish(false, -1);
    else {
      setAttempt(next);
      setPlayingProgress(0);
    }
  }

  function skip() {
    setHistory((h) => [...h, { guess: "(saltado)", correct: false }]);
    const next = attempt + 1;
    if (next >= DAILY_SNIPPETS) finish(false, -1);
    else {
      setAttempt(next);
      setPlayingProgress(0);
    }
  }

  async function share() {
    if (!result) return;
    const text = shareText(result);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const suggestions: Suggestion[] = useMemo(
    () =>
      pool.map((t) => ({
        id: t.trackId,
        label: t.trackName,
        sublabel: t.artistName,
        image: t.artworkUrl100,
        keywords: t.artistName,
      })),
    [pool],
  );

  if (phase === "loading") return <p className="hint">Cargando el reto diario...</p>;
  if (error) return <p className="error">Error: {error}</p>;
  if (phase === "empty")
    return (
      <div>
        <p className="hint">No se ha podido cargar el reto diario.</p>
        <button onClick={onBack}>Volver</button>
      </div>
    );

  return (
    <div className="game">
      <header className="game-header">
        <div>
          <button className="back" onClick={onBack}>← Volver</button>
        </div>
        <div className="meta">
          <strong>📅 Reto diario</strong>
          <span>{date}</span>
        </div>
      </header>

      {phase === "playing" && song && (
        <div className="round">
          <audio key={song.trackId} ref={audioRef} src={song.previewUrl} preload="auto" />
          <div className="bars">
            {SNIPPET_MS.map((ms, i) => {
              const fill = i < attempt ? 1 : i === attempt ? playingProgress : 0;
              return (
                <div key={i} className={"bar " + (i < attempt ? "used" : i === attempt ? "active" : "future")}>
                  <div className="bar-fill" style={{ width: `${fill * 100}%` }} />
                  <span className="bar-label">{ms / 1000}s</span>
                </div>
              );
            })}
          </div>
          <div className="controls">
            <button className="big play-btn" onClick={playSnippet}>
              <Play size={18} fill="currentColor" /> Reproducir {SNIPPET_MS[attempt] / 1000}s
            </button>
          </div>
          <GuessInput
            suggestions={suggestions}
            value={guess}
            onChange={setGuess}
            onSubmit={submitGuess}
            placeholder="Nombre de la canción..."
          />
          <div className="row">
            <button type="button" onClick={skip}>
              {attempt >= DAILY_SNIPPETS - 1 ? "Rendirse" : "Saltar"}
            </button>
          </div>
          <ul className="history">
            {history.map((h, i) => (
              <li key={i} className={h.correct ? "ok" : "bad"}>{h.guess}</li>
            ))}
          </ul>
        </div>
      )}

      {phase === "done" && result && song && (
        <div className="finished">
          <h2>{result.won ? "¡Acertaste!" : "Hoy no 😢"}</h2>
          <p className="grid-row">{result.grid}</p>
          <p className="big-score">{song.trackName}</p>
          <p className="reveal-artist">{song.artistName}</p>
          {song.artworkUrl100 && <img className="daily-art" src={song.artworkUrl100} alt="" />}
          <audio key={song.trackId} src={song.previewUrl} controls />
          <div className="row">
            <button className="big" onClick={share}>{copied ? "¡Copiado!" : "Compartir resultado"}</button>
            <button onClick={onBack}>Volver</button>
          </div>
          <p className="hint">Vuelve mañana para una nueva canción.</p>
        </div>
      )}
    </div>
  );
}
