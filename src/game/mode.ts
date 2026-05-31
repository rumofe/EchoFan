export type GameMode = "rounds" | "survival";
export type GuessTarget = "track" | "artist";

export interface GameConfig {
  mode: GameMode;
  totalRounds: number; // solo en modo "rounds"
  lives: number; // solo en modo "survival"
  guessTarget: GuessTarget; // qué se adivina: el título o el artista
}

export const ROUND_OPTIONS = [5, 10, 20];
export const LIVES_OPTIONS = [1, 3, 5];

export function configKey(config: GameConfig): string {
  const base = config.mode === "rounds"
    ? `rounds:${config.totalRounds}`
    : `survival:${config.lives}`;
  return config.guessTarget === "artist" ? `${base}:artist` : base;
}

export function modeLabel(config: GameConfig): string {
  return config.mode === "rounds"
    ? `${config.totalRounds} rondas`
    : `Supervivencia · ${config.lives} ${config.lives === 1 ? "vida" : "vidas"}`;
}
