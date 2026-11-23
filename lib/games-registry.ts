// Games that run a real engine, by catalog id. Any id not listed here keeps the fake ticker.
// Adding a real game means one entry below (SPEC 07).

import type { ComponentType } from 'react';
import { ArkanoidGame } from '@/components/arkanoid-game';
import { AsteroidsGame } from '@/components/asteroids-game';
import { SnakeGame } from '@/components/snake-game';
import { TetrisGame } from '@/components/tetris-game';

// What a real game reports. Each game sends the fields it has.
export type GameStats = {
  score: number;
  level: number;
  lives?: number;
  lines?: number;
  length?: number;
};

// One HUD slot after the score and before the level. Asteroids shows lives as hearts.
// Tetris shows lines as a number.
export type HudSlot = { label: string; value: number; hearts: boolean };

export type HudValues = { score: number; level: number; slot: HudSlot };

export type RealGameProps = {
  // Controlled by the player. true pauses the engine, false resumes it.
  paused: boolean;
  onStats: (stats: GameStats) => void;
  // Called once at game over, with the final score.
  onEnd: (score: number) => void;
  // Called when P or Escape is pressed.
  onTogglePause?: () => void;
};

export type RealGameEntry = {
  component: ComponentType<RealGameProps>;
  mapStats: (stats: GameStats) => HudValues;
};

const REAL_GAMES: Record<string, RealGameEntry> = {
  asteroids: {
    component: AsteroidsGame,
    mapStats: (s) => ({
      score: s.score,
      level: s.level,
      slot: { label: 'Lives', value: s.lives ?? 0, hearts: true },
    }),
  },
  tetris: {
    component: TetrisGame,
    mapStats: (s) => ({
      score: s.score,
      level: s.level,
      slot: { label: 'Lines', value: s.lines ?? 0, hearts: false },
    }),
  },
  arkanoid: {
    component: ArkanoidGame,
    mapStats: (s) => ({
      score: s.score,
      level: s.level,
      slot: { label: 'Lives', value: s.lives ?? 0, hearts: true },
    }),
  },
  snake: {
    component: SnakeGame,
    mapStats: (s) => ({
      score: s.score,
      level: s.level,
      slot: { label: 'Length', value: s.length ?? 0, hearts: false },
    }),
  },
};

export function getRealGame(id: string): RealGameEntry | undefined {
  return Object.prototype.hasOwnProperty.call(REAL_GAMES, id) ? REAL_GAMES[id] : undefined;
}
