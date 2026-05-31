import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { Track } from "../api/itunes";
import { titlesMatch } from "../game/normalize";
import { buildPool, pickWeighted, type Difficulty, DIFFICULTY_LABELS } from "../game/difficulty";
import { getBest, recordResult, type BestScore } from "../game/storage";
import { type GameConfig, configKey } from "../game/mode";
import { type ChallengeSource, sourceLabel, sourceKey, loadSourceTracks } from "../game/source";
import { playCorrect, playReveal, playWrong, playFanfare } from "../game/sounds";
import { celebrate, bigCelebrate } from "../game/confetti";
import { GuessInput } from "./GuessInput";

const SNIPPET_MS = [1000, 2000, 4000, 8000, 16000, 30000];
const POINTS = [6, 5, 4, 3, 2, 1];

interface Props {
  source: ChallengeSource;
  difficulty: Difficulty;
  config: GameConfig;
  onBack: () => void;
  onGameEnd?: (summary: { score: number; correct: number; total: number }) => void;
  endActions?: React.ReactNode;
}

type Phase = "loading" | "ready" | "playing" | "revealed" | "finished" | "empty";

interface RoundResult {
  track: Track;
  attempt: number;
  correct: boolean;
  points: number;
  multiplier: number;
}

// x1 los primeros 3 aciertos seguidos, x2 del 4º al 6º, etc. (tope x5)
function streakMultiplier(streak: number): number {
  return Math.min(Math.ceil(streak / 3), 5);
}

function longestStreak(results: RoundResult[]): number {
  let best = 0;
  let cur = 0;
  for (const r of results) {
    if (r.correct) {
      cur += 1;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  return best;
}

export function Game({ source, difficulty, config, onBack, onGameEnd, endActions }: Props) {
  const srcKey = useMemo(() => sourceKey(source), [source]);
  const srcLabel = useMemo(() => sourceLabel(source), [source]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [guess, setGuess] = useState("");
  const [history, setHistory] = useState<{ guess: string; correct: boolean }[]>([]);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [livesLeft, setLivesLeft] = useState(config.lives);
  const [streak, setStreak] = useState(0);
  const [playingProgress, setPlayingProgress] = useState(0);
  const [previousBest, setPreviousBest] = useState<BestScore | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const usedRef = useRef<Set<number>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const progressRafRef = useRef<number | null>(null);
  const startOffsetRef = useRef(0);

  const modeKey = useMemo(() => configKey(config), [config]);
  const score = useMemo(() => results.reduce((s, r) => s + r.points, 0), [results]);
  const correctCount = useMemo(() => results.filter((r) => r.correct).length, [results]);

  useEffect(() => {
    setPreviousBest(getBest(srcKey, difficulty, modeKey));
  }, [srcKey, difficulty, modeKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const deduped = await loadSourceTracks(source);
        if (cancelled) return;
        if (deduped.length === 0) {
          setPhase("empty");
        } else {
          setTracks(deduped);
          setPhase("ready");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error cargando canciones");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [srcKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const pool = useMemo(() => buildPool(tracks, difficulty), [tracks, difficulty]);

  const guessTarget = config.guessTarget;
  const answerOf = (t: Track) => (guessTarget === "artist" ? t.artistName : t.trackName);

  // El autocompletado busca sobre TODO el catálogo cargado (no solo el pool de
  // dificultad), para que se puedan encontrar canciones de todos los artistas.
  const suggestions = useMemo(() => {
    if (guessTarget === "artist") {
      const byName = new Map<string, { id: string; label: string; image?: string }>();
      for (const t of tracks) {
        if (!byName.has(t.artistName)) {
          byName.set(t.artistName, { id: t.artistName, label: t.artistName, image: t.artworkUrl100 });
        }
      }
      return Array.from(byName.values());
    }
    return tracks.map((t) => ({
      id: t.trackId,
      label: t.trackName,
      sublabel: t.artistName,
      image: t.artworkUrl100,
      keywords: t.artistName, // permite buscar por artista y ver sus canciones
    }));
  }, [tracks, guessTarget]);

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

  function startRound() {
    const picked = pickWeighted(pool, usedRef.current, (t) => t.trackId);
    if (!picked) {
      usedRef.current.clear();
      const fresh = pickWeighted(pool, usedRef.current, (t) => t.trackId);
      if (!fresh) return;
      usedRef.current.add(fresh.trackId);
      setCurrent(fresh);
    } else {
      usedRef.current.add(picked.trackId);
      setCurrent(picked);
    }
    setAttempt(0);
    setGuess("");
    setHistory([]);
    setPhase("playing");
    const maxStart = Math.max(0, 30000 - SNIPPET_MS[SNIPPET_MS.length - 1]);
    startOffsetRef.current = Math.random() * maxStart;
  }

  function endGame(allResults: RoundResult[]) {
    const finalScore = allResults.reduce((s, r) => s + r.points, 0);
    const { best, isNewRecord: rec } = recordResult(srcKey, difficulty, modeKey, finalScore);
    setPreviousBest(best);
    setIsNewRecord(rec);
    setPhase("finished");
    const won = allResults[allResults.length - 1]?.correct;
    if (rec) {
      playFanfare();
      bigCelebrate();
    } else if (won) {
      playCorrect();
    } else {
      playReveal();
    }
    onGameEnd?.({
      score: finalScore,
      correct: allResults.filter((r) => r.correct).length,
      total: allResults.length,
    });
  }

  function finishRound(track: Track, finalAttempt: number, correct: boolean) {
    const basePoints = correct ? POINTS[finalAttempt] : 0;
    let points = basePoints;
    let multiplier = 1;

    if (config.mode === "survival") {
      if (correct) {
        const newStreak = streak + 1;
        multiplier = streakMultiplier(newStreak);
        points = basePoints * multiplier;
        setStreak(newStreak);
      } else {
        setStreak(0);
      }
    }

    const round: RoundResult = { track, attempt: finalAttempt, correct, points, multiplier };
    const allResults = [...results, round];
    setResults(allResults);
    if (correct) celebrate();

    if (config.mode === "rounds") {
      if (allResults.length >= config.totalRounds) {
        endGame(allResults);
      } else {
        setPhase("revealed");
        if (correct) playCorrect();
        else playReveal();
      }
      return;
    }

    // Supervivencia: fallar cuesta una vida.
    const newLives = correct ? livesLeft : livesLeft - 1;
    setLivesLeft(newLives);
    if (newLives <= 0) {
      endGame(allResults);
    } else {
      setPhase("revealed");
      if (correct) playCorrect();
      else playReveal();
    }
  }

  function playSnippet() {
    if (!current || !audioRef.current) return;
    stopAudio();
    const audio = audioRef.current;
    const durationMs = SNIPPET_MS[attempt];
    audio.currentTime = startOffsetRef.current / 1000;
    const begin = performance.now();
    const tick = () => {
      const elapsed = performance.now() - begin;
      setPlayingProgress(Math.min(1, elapsed / durationMs));
      if (elapsed < durationMs) {
        progressRafRef.current = requestAnimationFrame(tick);
      }
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

  function submitGuess() {
    if (!current || !guess.trim()) return;
    const correct = titlesMatch(guess, answerOf(current));
    setHistory((h) => [...h, { guess: guess.trim(), correct }]);
    setGuess("");
    if (correct) {
      stopAudio();
      finishRound(current, attempt, true);
      return;
    }
    playWrong();
    const next = attempt + 1;
    if (next >= SNIPPET_MS.length) {
      stopAudio();
      finishRound(current, attempt, false);
    } else {
      setAttempt(next);
      setPlayingProgress(0);
    }
  }

  function skipAttempt() {
    if (!current) return;
    setHistory((h) => [...h, { guess: "(saltado)", correct: false }]);
    const next = attempt + 1;
    if (next >= SNIPPET_MS.length) {
      stopAudio();
      finishRound(current, attempt, false);
    } else {
      setAttempt(next);
      setPlayingProgress(0);
    }
  }

  function giveUp() {
    if (!current) return;
    stopAudio();
    finishRound(current, attempt, false);
  }

  function restart() {
    usedRef.current.clear();
    setResults([]);
    setLivesLeft(config.lives);
    setStreak(0);
    setIsNewRecord(false);
    setPreviousBest(getBest(srcKey, difficulty, modeKey));
    startRound();
  }

  useEffect(() => () => stopAudio(), []);

  if (phase === "loading") return <p className="hint">Cargando canciones de {srcLabel}...</p>;
  if (error) return <p className="error">Error: {error}</p>;
  if (phase === "empty")
    return (
      <div>
        <p className="hint">No se han encontrado canciones reproducibles para {srcLabel}.</p>
        <button onClick={onBack}>Volver</button>
      </div>
    );

  const lastAttempt = attempt >= SNIPPET_MS.length - 1;
  const roundNumber = results.length + (phase === "playing" || phase === "revealed" ? 1 : 0);

  return (
    <div className="game">
      <header className="game-header">
        <div>
          <button className="back" onClick={onBack}>← Cambiar reto</button>
        </div>
        <div className="meta">
          <strong>{srcLabel}</strong>
          <span>{DIFFICULTY_LABELS[difficulty]}</span>
          {config.mode === "rounds" ? (
            <span>Ronda: {Math.min(roundNumber, config.totalRounds)}/{config.totalRounds}</span>
          ) : (
            <>
              <span className="lives" title="Vidas restantes">
                {"❤".repeat(livesLeft)}
                <span className="lives-lost">{"♡".repeat(Math.max(0, config.lives - livesLeft))}</span>
              </span>
              <span>Ronda: {roundNumber}</span>
              <span className="streak" title="Racha · multiplicador del próximo acierto">
                🔥 {streak} · x{streakMultiplier(streak + 1)}
              </span>
            </>
          )}
          <span>Puntos: {score}</span>
          {previousBest && <span>Récord: {previousBest.score}</span>}
        </div>
      </header>

      {phase === "ready" && (
        <div className="center">
          <button className="big" onClick={startRound}>Empezar</button>
        </div>
      )}

      {phase === "playing" && current && (
        <div className="round">
          <audio key={current.trackId} ref={audioRef} src={current.previewUrl} preload="auto" />
          <div className="bars">
            {SNIPPET_MS.map((ms, i) => {
              const fill = i < attempt ? 1 : i === attempt ? playingProgress : 0;
              return (
                <div
                  key={i}
                  className={
                    "bar " +
                    (i < attempt ? "used" : i === attempt ? "active" : "future")
                  }
                >
                  <div className="bar-fill" style={{ width: `${fill * 100}%` }} />
                  <span className="bar-label">{ms < 1000 ? `${ms}ms` : `${ms / 1000}s`}</span>
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
            placeholder={guessTarget === "artist" ? "¿Qué artista es?" : "Nombre de la canción..."}
          />
          <div className="row">
            <button type="button" onClick={skipAttempt}>
              {lastAttempt ? "Rendirse" : "Saltar intento"}
            </button>
            <button type="button" onClick={giveUp} className="ghost">
              Ver respuesta
            </button>
          </div>
          <ul className="history">
            {history.map((h, i) => (
              <li key={i} className={h.correct ? "ok" : "bad"}>
                {h.guess}
              </li>
            ))}
          </ul>
        </div>
      )}

      {phase === "revealed" && current && (
        <div className="reveal">
          <h2>{current.trackName}</h2>
          <p className="reveal-artist">{current.artistName}</p>
          <p>{current.collectionName}</p>
          {(() => {
            const last = results[results.length - 1];
            if (!last) return null;
            if (!last.correct) return <p className="round-points bad">Fallada</p>;
            return (
              <p className="round-points ok">
                +{last.points} puntos
                {last.multiplier > 1 && <span className="mult"> 🔥 x{last.multiplier}</span>}
              </p>
            );
          })()}
          {current.artworkUrl100 && <img key={current.trackId} src={current.artworkUrl100} alt="" />}
          <audio key={current.trackId} src={current.previewUrl} controls />
          <div className="controls">
            <button className="big" onClick={startRound}>Siguiente canción</button>
          </div>
        </div>
      )}

      {phase === "finished" && (
        <div className="finished">
          <h2>{config.mode === "survival" ? "Sin vidas" : "Partida terminada"}</h2>
          <motion.p
            className="big-score"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 16 }}
          >
            {score} puntos
          </motion.p>
          {config.mode === "survival" ? (
            <p className="hint">
              Sobreviviste {results.length} {results.length === 1 ? "ronda" : "rondas"} · {correctCount} aciertos · mejor racha {longestStreak(results)} 🔥
            </p>
          ) : (
            <p className="hint">
              {correctCount} aciertos de {config.totalRounds} ({Math.round((correctCount / config.totalRounds) * 100)}%)
            </p>
          )}
          {isNewRecord ? (
            <p className="record">¡Nuevo récord!</p>
          ) : (
            previousBest && <p className="hint">Récord: {previousBest.score}</p>
          )}
          <ul className="round-list">
            {results.map((r, i) => (
              <li key={i} className={r.correct ? "ok" : "bad"}>
                <span>{i + 1}.</span>
                <span className="track-name">{r.track.trackName}</span>
                <span>
                  {r.correct
                    ? `+${r.points}${r.multiplier > 1 ? ` 🔥x${r.multiplier}` : ""} (${SNIPPET_MS[r.attempt] / 1000}s)`
                    : "fallada"}
                </span>
              </li>
            ))}
          </ul>
          <div className="row">
            {endActions ?? (
              <>
                <button className="big" onClick={restart}>Jugar otra</button>
                <button onClick={onBack}>Cambiar reto</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
