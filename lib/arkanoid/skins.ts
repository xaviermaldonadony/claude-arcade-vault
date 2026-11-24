// Skins for the Arkanoid canvas. Classic is the baseline look (the sprite sheet as-is on black).
// Neo adds glow on near-black, using the arcade.css accents. Retro mutes the sprite sheet
// into a warm, low-saturation CRT palette with flat shading.
// Drawing only: reads no state and changes none. No React or Next imports.

import type { BrickColor } from './types';

export const SKIN_IDS = ['classic', 'neo', 'retro'] as const;
export type SkinId = (typeof SKIN_IDS)[number];

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === 'string' && (SKIN_IDS as readonly string[]).includes(value);
}

// How the sprite sheet is recolored before drawing. 'none' draws the sheet unchanged.
export type SheetTint = 'none' | 'retro';

export type Skin = {
  label: string;
  canvasBg: string; // dark canvas, #000 to #15151f
  hud: string; // score and level text
  hudDim: string; // lives label area and pause hint
  overlayTitle: string; // GAME OVER, PAUSED, and the win message
  scrimGameOver: string; // dim layer behind GAME OVER and the win message
  scrimPause: string; // dim layer behind PAUSED
  sheetTint: SheetTint;
  glow: number; // shadowBlur in px for paddle, ball, and bricks. 0 is flat.
  paddleGlow: string;
  ballGlow: string;
  brickGlow: Record<BrickColor, string>;
};

// Classic: the sprite sheet drawn as-is on black, with white text. This is the original look.
const CLASSIC: Skin = {
  label: 'Classic',
  canvasBg: '#000000',
  hud: '#ffffff',
  hudDim: '#ffffff',
  overlayTitle: '#ffffff',
  scrimGameOver: 'rgba(0, 0, 0, 0.6)',
  scrimPause: 'rgba(0, 0, 0, 0.65)',
  sheetTint: 'none',
  glow: 0,
  paddleGlow: '#ffffff',
  ballGlow: '#ffffff',
  brickGlow: {
    gray: '#ffffff',
    red: '#ffffff',
    yellow: '#ffffff',
    cyan: '#ffffff',
    magenta: '#ffffff',
    hotpink: '#ffffff',
    green: '#ffffff',
  },
};

// Neo: glow on near-black. Canvas is --bg, HUD is --ink, titles are --magenta.
// Paddle glows cyan, ball glows yellow, and each brick glows its own color.
const NEO: Skin = {
  label: 'Neo',
  canvasBg: '#0a0a0f', // --bg
  hud: '#e6e9ff', // --ink
  hudDim: '#8a8fb5', // --ink-dim
  overlayTitle: '#ff006e', // --magenta
  scrimGameOver: 'rgba(10, 10, 15, 0.7)',
  scrimPause: 'rgba(10, 10, 15, 0.75)',
  sheetTint: 'none',
  glow: 12,
  paddleGlow: '#00f5ff', // --cyan
  ballGlow: '#f5ff00', // --yellow
  brickGlow: {
    gray: '#c7d0e0', // --silver
    red: '#ff006e', // --magenta
    yellow: '#f5ff00', // --yellow
    cyan: '#00f5ff', // --cyan
    magenta: '#ff00e6',
    hotpink: '#ff6ec7',
    green: '#00ff88', // --green
  },
};

// Retro: a muted CRT palette. The sprite sheet is desaturated and warmed, the text is amber,
// and nothing glows. Flat shading only.
const RETRO: Skin = {
  label: 'Retro',
  canvasBg: '#14110d',
  hud: '#e0a94f', // muted amber, about 8:1 on the canvas
  hudDim: '#a07a3c', // about 4.9:1 on the canvas
  overlayTitle: '#e0a94f',
  scrimGameOver: 'rgba(20, 17, 13, 0.7)',
  scrimPause: 'rgba(20, 17, 13, 0.75)',
  sheetTint: 'retro',
  glow: 0,
  paddleGlow: '#e0a94f',
  ballGlow: '#e0a94f',
  brickGlow: {
    gray: '#c9b89a',
    red: '#e0a94f',
    yellow: '#e0a94f',
    cyan: '#e0a94f',
    magenta: '#e0a94f',
    hotpink: '#e0a94f',
    green: '#e0a94f',
  },
};

export const SKINS: Record<SkinId, Skin> = {
  classic: CLASSIC,
  neo: NEO,
  retro: RETRO,
};
