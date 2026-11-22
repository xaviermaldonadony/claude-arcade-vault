// Skins for the Tetris canvas. Palettes and drawing follow SPEC 07, Conventions.
// Drawing only: reads no state and changes none. No React or Next imports.

import { COLORS } from './constants';

export const SKIN_IDS = ['retro', 'neon', 'pastel', 'pixel'] as const;
export type SkinId = (typeof SKIN_IDS)[number];

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === 'string' && (SKIN_IDS as readonly string[]).includes(value);
}

// Paints one block body at (px, py) with side s, in the given color.
export type CellDrawer = (
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  s: number,
  color: string,
) => void;

export type Skin = {
  label: string;
  colors: readonly (string | null)[]; // indexed 1..8 like COLORS
  canvasBg: string;
  grid: string;
  ghostAlpha: number;
  drawCell: CellDrawer;
};

// Index 8 is the nut piece. Chosen in SPEC 07, because 03-claude-tetris has no nut.
const NEON_COLORS: readonly (string | null)[] = [
  null,
  '#00f0ff', // I
  '#fff200', // O
  '#ff00e6', // T
  '#39ff14', // S
  '#ff1744', // Z
  '#2979ff', // J
  '#ffab00', // L
  '#b0bec5', // N (nut)
];

// Index 8 is the nut piece. Chosen in SPEC 07, because 03-claude-tetris has no nut.
const PASTEL_COLORS: readonly (string | null)[] = [
  null,
  '#b5e6f2', // I
  '#fff1a8', // O
  '#d7bfef', // T
  '#bfeec4', // S
  '#f7bcbc', // Z
  '#bcd3f5', // J
  '#ffd3a8', // L
  '#d6dde3', // N (nut)
];

// Retro: flat block with a 4 px top highlight strip, as in the reference.
function drawCellRetro(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  s: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(px, py, s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(px, py, s, 4);
}

// Neon: glow of 12 px in the block color, with a white inner outline at 55% alpha.
function drawCellNeon(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  s: number,
  color: string,
): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  ctx.fillRect(px, py, s, s);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 2.5, py + 2.5, s - 5, s - 5);
  ctx.restore();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Pastel: rounded body, faint border, light sheen along the top.
function drawCellPastel(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  s: number,
  color: string,
): void {
  const r = Math.max(3, s * 0.25);
  roundRectPath(ctx, px + 0.5, py + 0.5, s - 1, s - 1, r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,100,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();
  roundRectPath(ctx, px + 3, py + 3, s - 6, (s - 6) * 0.35, r / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
}

// Pixel art: flat block, 2 by 2 dither overlay, 2 px bevel (light top and left, dark bottom and right).
// The dither is a cached 4 by 4 pattern, not 196 fillRect calls per block, to keep the frame fast.
let ditherTile: HTMLCanvasElement | null = null;
const ditherPatterns = new WeakMap<CanvasRenderingContext2D, CanvasPattern | null>();

function ditherPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const cached = ditherPatterns.get(ctx);
  if (cached !== undefined) return cached;
  if (!ditherTile) {
    ditherTile = document.createElement('canvas');
    ditherTile.width = 4;
    ditherTile.height = 4;
    const t = ditherTile.getContext('2d');
    if (t) {
      t.fillStyle = 'rgba(0,0,0,0.18)';
      t.fillRect(0, 0, 2, 2);
      t.fillRect(2, 2, 2, 2);
      t.fillStyle = 'rgba(255,255,255,0.12)';
      t.fillRect(2, 0, 2, 2);
      t.fillRect(0, 2, 2, 2);
    }
  }
  const pattern = ctx.createPattern(ditherTile, 'repeat');
  ditherPatterns.set(ctx, pattern);
  return pattern;
}

function drawCellPixel(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  s: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(px, py, s, s);
  const pattern = ditherPattern(ctx);
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(px, py, s, s);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(px, py, s, 2);
  ctx.fillRect(px, py, 2, s);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(px, py + s - 2, s, 2);
  ctx.fillRect(px + s - 2, py, 2, s);
}

// Canvas background and grid are the reference dark values, read from
// references/started-games/03-tetris/style.css. Neon, Pastel and Pixel art: SPEC 07, Conventions.
export const SKINS: Record<SkinId, Skin> = {
  retro: {
    label: 'Retro',
    colors: COLORS,
    canvasBg: '#1a1a25',
    grid: '#22222e',
    ghostAlpha: 0.2,
    drawCell: drawCellRetro,
  },
  neon: {
    label: 'Neon',
    colors: NEON_COLORS,
    canvasBg: '#000000',
    grid: '#0b2a33',
    ghostAlpha: 0.35,
    drawCell: drawCellNeon,
  },
  pastel: {
    label: 'Pastel',
    colors: PASTEL_COLORS,
    canvasBg: '#fffafd',
    grid: '#f1e6f1',
    ghostAlpha: 0.3,
    drawCell: drawCellPastel,
  },
  pixel: {
    label: 'Pixel art',
    colors: COLORS,
    canvasBg: '#12122a',
    grid: '#1f1f3a',
    ghostAlpha: 0.25,
    drawCell: drawCellPixel,
  },
};
