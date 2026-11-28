// Skins for the Frogger canvas. Palettes only: the drawing lives in components/frogger-game.tsx.
// No React or Next imports. Classic is the original look, so default players see no change.

export const SKIN_IDS = ['classic', 'neo', 'retro'] as const;
export type SkinId = (typeof SKIN_IDS)[number];

export const DEFAULT_SKIN: SkinId = 'classic';

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === 'string' && (SKIN_IDS as readonly string[]).includes(value);
}

export type FroggerSkin = {
  label: string;
  canvasBg: string; // fills the canvas before the rows are drawn
  goal: {
    bg: string; // goal row
    bayFill: string;
    bayStroke: string;
    bayFilled: string; // a bay the frog reached
  };
  rows: {
    river: string; // river top colour
    riverBottom: string | null; // vertical gradient to this colour, or null for flat fill
    road: string;
    safe: string; // median and start rows
  };
  laneEdge: string | null; // thin lines on the top and bottom of each road lane
  cars: readonly string[]; // cycled per car in a lane
  wheel: string;
  truck: { body: string; cab: string };
  log: { fill: string; grain: string; outline: string | null };
  turtle: {
    fill: string | null; // null: outlined ring only
    ring: string;
    inner: string | null;
    submerged: string; // ring colour when the turtle dives
  };
  frog: { body: string; legs: string; eye: string; pupil: string };
  hud: { text: string; lives: string; timeHigh: string; timeMid: string; timeLow: string };
  glow: number; // shadowBlur in px for moving pieces. 0 turns glow off
  scanlines: number; // alpha of the dark lines over the board. 0 turns them off
};

export const SKINS: Record<SkinId, FroggerSkin> = {
  // The original look: near-black road, deep blue river, brown logs, flat fills, no glow.
  classic: {
    label: 'Classic',
    canvasBg: '#000000',
    goal: { bg: '#06140a', bayFill: '#9be7a6', bayStroke: '#d4a017', bayFilled: '#1a7a2e' },
    rows: { river: '#0a2a5c', riverBottom: null, road: '#141414', safe: '#0d3b1a' },
    laneEdge: null,
    cars: ['#d62828', '#f7c600', '#2a6fdb'],
    wheel: '#000000',
    truck: { body: '#8a8f98', cab: '#4b4f57' },
    log: { fill: '#a0683a', grain: '#5c3513', outline: null },
    turtle: {
      fill: '#2e9e55',
      ring: '#2e9e55',
      inner: '#1e6b3a',
      submerged: 'rgba(120, 220, 160, 0.35)',
    },
    frog: { body: '#7cff4f', legs: '#2e9e55', eye: '#ffffff', pupil: '#000000' },
    hud: {
      text: '#ffffff',
      lives: '#7cff4f',
      timeHigh: '#3cff5a',
      timeMid: '#ffe14d',
      timeLow: '#ff4d4d',
    },
    glow: 0,
    scanlines: 0,
  },
  // Neon on near-black. Accents from app/arcade.css: cyan, magenta, green, yellow.
  neo: {
    label: 'Neo',
    canvasBg: '#000000',
    goal: { bg: '#000000', bayFill: '#03241a', bayStroke: '#00ff88', bayFilled: '#00ff88' },
    rows: { river: '#2a0019', riverBottom: '#080008', road: '#050508', safe: '#02080a' },
    laneEdge: '#00f5ff',
    cars: ['#00f5ff', '#ff006e', '#f5ff00'],
    wheel: '#000000',
    truck: { body: '#00ff88', cab: '#003d24' },
    log: { fill: '#120e00', grain: '#8a8f00', outline: '#f5ff00' },
    turtle: {
      fill: '#00ff88',
      ring: '#00ff88',
      inner: '#000000',
      submerged: 'rgba(0, 255, 136, 0.35)',
    },
    frog: { body: '#00ff88', legs: '#00ff88', eye: '#ffffff', pupil: '#000000' },
    hud: {
      text: '#00f5ff',
      lives: '#00ff88',
      timeHigh: '#00ff88',
      timeMid: '#f5ff00',
      timeLow: '#ff006e',
    },
    glow: 10,
    scanlines: 0,
  },
  // Green phosphor CRT. Shades of green on black, scanlines, solid cars and logs,
  // outlined turtles. The frog is the only solid bright shape.
  retro: {
    label: 'Retro',
    canvasBg: '#000000',
    goal: { bg: '#020f07', bayFill: '#0b3d24', bayStroke: '#137a48', bayFilled: '#2fbf71' },
    rows: { river: '#031a0e', riverBottom: null, road: '#000000', safe: '#021008' },
    laneEdge: null,
    cars: ['#1f8f55', '#137a48', '#2fbf71'],
    wheel: '#021008',
    truck: { body: '#1f8f55', cab: '#0b5a33' },
    log: { fill: '#137a48', grain: '#0b3d24', outline: null },
    turtle: { fill: null, ring: '#2fbf71', inner: null, submerged: '#137a48' },
    frog: { body: '#00ff88', legs: '#00ff88', eye: '#001a0d', pupil: '#000000' },
    hud: {
      text: '#2fbf71',
      lives: '#2fbf71',
      timeHigh: '#2fbf71',
      timeMid: '#1f8f55',
      timeLow: '#137a48',
    },
    glow: 0,
    scanlines: 0.3,
  },
};
