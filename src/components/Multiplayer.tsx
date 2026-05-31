import { useState } from "react";
import { Game } from "./Game";
import type { Difficulty } from "../game/difficulty";
import type { GameConfig } from "../game/mode";
import type { ChallengeSource } from "../game/source";
import { sourceLabel } from "../game/source";

interface PlayerScore {
  name: string;
  score: number;
  correct: number;
  total: number;
}

interface Props {
  players: string[];
  source: ChallengeSource;
  difficulty: Difficulty;
  config: GameConfig;
  onExit: () => void;
}

type Phase = "handoff" | "play" | "leaderboard";

export function Multiplayer({ players, source, difficulty, config, onExit }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("handoff");
  const [scores, setScores] = useState<PlayerScore[]>([]);
  const [pending, setPending] = useState<{ score: number; correct: number; total: number } | null>(null);

  function endTurn() {
    if (!pending) return;
    const entry: PlayerScore = { name: players[index], ...pending };
    const updated = [...scores, entry];
    setScores(updated);
    setPending(null);
    if (index + 1 < players.length) {
      setIndex(index + 1);
      setPhase("handoff");
    } else {
      setPhase("leaderboard");
    }
  }

  function restart() {
    setIndex(0);
    setScores([]);
    setPending(null);
    setPhase("handoff");
  }

  if (phase === "handoff") {
    return (
      <div className="game">
      <div className="finished handoff">
        <h2>Turno de</h2>
        <p className="big-score">{players[index]}</p>
        <p className="hint">
          Reto: {sourceLabel(source)} · Jugador {index + 1} de {players.length}
        </p>
        <p className="hint">Pasa el dispositivo y dale cuando estés listo.</p>
        <div className="row">
          <button className="big" onClick={() => setPhase("play")}>Empezar turno</button>
          <button onClick={onExit}>Salir</button>
        </div>
      </div>
      </div>
    );
  }

  if (phase === "leaderboard") {
    const ranked = [...scores].sort((a, b) => b.score - a.score);
    const top = ranked[0]?.score ?? 0;
    return (
      <div className="game">
      <div className="finished">
        <h2>🏆 Clasificación</h2>
        <ul className="round-list leaderboard">
          {ranked.map((p, i) => (
            <li key={p.name + i} className={p.score === top ? "ok" : ""}>
              <span>{i + 1}.</span>
              <span className="track-name">{p.name}</span>
              <span>{p.score} pts · {p.correct}/{p.total}</span>
            </li>
          ))}
        </ul>
        <div className="row">
          <button className="big" onClick={restart}>Otra partida</button>
          <button onClick={onExit}>Salir</button>
        </div>
      </div>
      </div>
    );
  }

  return (
    <Game
      key={index}
      source={source}
      difficulty={difficulty}
      config={config}
      onBack={onExit}
      onGameEnd={setPending}
      endActions={
        <button className="big" onClick={endTurn}>
          {index + 1 < players.length ? "Terminar turno" : "Ver clasificación"}
        </button>
      }
    />
  );
}
