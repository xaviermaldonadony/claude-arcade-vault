// Skins for the Snake canvas (SPEC 09). Classic is the original look. Neo uses the arcade.css accents.
// Retro is a muted CRT set with flat pixel blocks and monochrome fruit.
// Drawing only: reads no state and changes none. No React or Next imports.

export const SKIN_IDS = ['classic', 'neo', 'retro'] as const;
export type SkinId = (typeof SKIN_IDS)[number];

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === 'string' && (SKIN_IDS as readonly string[]).includes(value);
}

export type Skin = {
  label: string;
  canvasBg: string; // dark canvas, #000 to #15151f
  grid: string; // grid lines, drawn under everything
  body: string; // snake body blocks
  head: string; // snake head block
  shade: string | null; // 2 px bottom and right edge on blocks. null is no bevel
  fallback: string; // magenta dot drawn when the sprite sheet is not loaded
  hud: string; // PAUSED title
  hudDim: string; // text behind the pause overlay
  glow: number; // shadowBlur in px for snake and fruit. 0 is flat
  glowColor: string; // shadow color for the fruit. Snake blocks glow in their own color
  // Fruit sprite tint. null keeps the full-color sprite. A color draws a one-color silhouette.
  fruitTint: string | null;
};

// Classic: the original green snake on a dark canvas, full-color fruit, no glow.
const CLASSIC: Skin = {
  label: 'Classic',
  canvasBg: '#0a0a0f',
  grid: 'rgba(0, 255, 136, 0.06)',
  body: '#00ff88',
  head: '#b8ffd9',
  shade: null,
  fallback: '#ff006e',
  hud: '#e6e9ff',
  hudDim: 'rgba(0, 0, 0, 0.6)',
  glow: 0,
  glowColor: '#00ff88',
  fruitTint: null,
};

// Neo: neon snake with a glow on near-black. Accents from app/arcade.css.
const NEO: Skin = {
  label: 'Neo',
  canvasBg: '#0a0a0f',
  grid: 'rgba(0, 245, 255, 0.08)', // --cyan
  body: '#00ff88', // --green
  head: '#f5ff00', // --yellow
  shade: null,
  fallback: '#ff006e', // --magenta
  hud: '#e6e9ff', // --ink
  hudDim: 'rgba(0, 0, 0, 0.6)',
  glow: 12,
  glowColor: '#00f5ff', // --cyan
  fruitTint: null,
};

// Retro: phosphor green and amber on a muted CRT background. Flat pixel blocks, mono fruit.
const RETRO: Skin = {
  label: 'Retro',
  canvasBg: '#0d0d14',
  grid: '#15151f',
  body: '#7fb069',
  head: '#d9a441',
  shade: '#4d6b3f',
  fallback: '#c0523a',
  hud: '#d9a441',
  hudDim: 'rgba(0, 0, 0, 0.7)',
  glow: 0,
  glowColor: '#d9a441',
  fruitTint: '#d9a441',
};

export const SKINS: Record<SkinId, Skin> = {
  classic: CLASSIC,
  neo: NEO,
  retro: RETRO,
};
