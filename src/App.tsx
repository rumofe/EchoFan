import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { Game } from "./components/Game";
import { DailyGame } from "./components/DailyGame";
import { Multiplayer } from "./components/Multiplayer";
import { SourcePicker } from "./components/SourcePicker";
import { Landing } from "./components/Landing";
import type { Difficulty } from "./game/difficulty";
import { DIFFICULTY_LABELS } from "./game/difficulty";
import { type GameMode, type GuessTarget, ROUND_OPTIONS, LIVES_OPTIONS } from "./game/mode";
import type { ChallengeSource } from "./game/source";
import "./App.css";

type View = "landing" | "menu" | "daily" | "single" | "multi";

function App() {
  const [view, setView] = useState<View>("landing");
  const [source, setSource] = useState<ChallengeSource | null>(null);
  const [guessTarget, setGuessTarget] = useState<GuessTarget>("track");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [mode, setMode] = useState<GameMode>("rounds");
  const [totalRounds, setTotalRounds] = useState<number>(10);
  const [lives, setLives] = useState<number>(3);
  const [multiplayer, setMultiplayer] = useState(false);
  const [players, setPlayers] = useState<string[]>(["Jugador 1", "Jugador 2"]);

  const config = { mode, totalRounds, lives, guessTarget };

  function startGame(s: ChallengeSource, target: GuessTarget) {
    setGuessTarget(target);
    setSource(s);
    setView(multiplayer ? "multi" : "single");
  }

  function setPlayerName(i: number, name: string) {
    setPlayers(players.map((p, idx) => (idx === i ? name : p)));
  }

  function backToMenu() {
    setView("menu");
    setSource(null);
  }

  if (view === "landing")
    return <Landing onPlay={() => setView("menu")} onDaily={() => setView("daily")} />;

  if (view === "daily") return <Shell viewKey="daily"><DailyGame onBack={backToMenu} /></Shell>;

  if (view === "single" && source)
    return (
      <Shell viewKey="single">
        <Game source={source} difficulty={difficulty} config={config} onBack={backToMenu} />
      </Shell>
    );

  if (view === "multi" && source)
    return (
      <Shell viewKey="multi">
        <Multiplayer
          players={players.map((p, i) => p.trim() || `Jugador ${i + 1}`)}
          source={source}
          difficulty={difficulty}
          config={config}
          onExit={backToMenu}
        />
      </Shell>
    );

  return (
    <Shell viewKey="menu">
      <div className="setup">
        <button className="big daily-btn" onClick={() => setView("daily")}>
          <Calendar size={20} /> Reto diario
        </button>

        <div className="setting">
          <label>Dificultad</label>
          <div className="chip-row">
            {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
              <button key={d} className={d === difficulty ? "selected" : ""} onClick={() => setDifficulty(d)}>
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="setting">
          <label>Modo de juego</label>
          <div className="chip-row">
            <button className={mode === "rounds" ? "selected" : ""} onClick={() => setMode("rounds")}>
              Por rondas
            </button>
            <button className={mode === "survival" ? "selected" : ""} onClick={() => setMode("survival")}>
              Supervivencia
            </button>
          </div>
        </div>

        {mode === "rounds" ? (
          <div className="setting">
            <label>Número de rondas</label>
            <div className="chip-row">
              {ROUND_OPTIONS.map((n) => (
                <button key={n} className={n === totalRounds ? "selected" : ""} onClick={() => setTotalRounds(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="setting">
            <label>Vidas</label>
            <div className="chip-row">
              {LIVES_OPTIONS.map((n) => (
                <button key={n} className={n === lives ? "selected" : ""} onClick={() => setLives(n)}>
                  {"❤".repeat(n)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="setting">
          <label>Multijugador local</label>
          <div className="chip-row">
            <button className={!multiplayer ? "selected" : ""} onClick={() => setMultiplayer(false)}>
              1 jugador
            </button>
            <button className={multiplayer ? "selected" : ""} onClick={() => setMultiplayer(true)}>
              Pasar y jugar
            </button>
          </div>
          {multiplayer && (
            <div className="players-editor">
              {players.map((p, i) => (
                <div key={i} className="player-row">
                  <input type="text" value={p} onChange={(e) => setPlayerName(i, e.target.value)} />
                  {players.length > 2 && (
                    <button onClick={() => setPlayers(players.filter((_, idx) => idx !== i))}>✕</button>
                  )}
                </div>
              ))}
              {players.length < 4 && (
                <button onClick={() => setPlayers([...players, `Jugador ${players.length + 1}`])}>
                  + Añadir jugador
                </button>
              )}
              <p className="hint">Cada jugador juega su turno; al final se compara la puntuación.</p>
            </div>
          )}
        </div>

        <div className="setting">
          <label>Reto</label>
          <SourcePicker onStart={startGame} />
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children, viewKey }: { children: React.ReactNode; viewKey: string }) {
  return (
    <div className="app">
      <header className="app-header">
        <h1><span className="echo">Echo</span>Fan</h1>
        <p className="tagline">Elige un reto y adivina las canciones</p>
      </header>
      <motion.main
        key={viewKey}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {children}
      </motion.main>
    </div>
  );
}

export default App;
