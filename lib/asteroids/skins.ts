// Skins for the Asteroids canvas. Classic is the reference look. Neo uses the arcade.css accents.
// Retro is a muted CRT set with three colors and flat shapes.
// Drawing only: reads no state and changes none. No React or Next imports.

export const SKIN_IDS = ['classic', 'neo', 'retro'] as const;
export type SkinId = (typeof SKIN_IDS)[number];

export function isSkinId(value: unknown): value is SkinId {
  return typeof value === 'string' && (SKIN_IDS as readonly string[]).includes(value);
}

export type Skin = {
  label: string;
  canvasBg: string; // dark canvas, #000 to #15151f
  line: string; // asteroid outlines and life icons
  ship: string; // ship outline
  shot: string; // bullets
  powerUp: string; // power-up box, its label, and the triple shot HUD
  thrust: string; // thruster flame
  hud: string; // score, level, and overlay title
  hudDim: string; // overlay subtitle
  particle: string; // 'r, g, b' triple. Particles fade by alpha.
  glow: number; // shadowBlur in px for outlines and shots. 0 is flat.
  pixelShot: boolean; // bullets drawn as squares instead of dots
};

// Classic: the original white vector look on black, with the cyan power-up and orange flame.
const CLASSIC: Skin = {
  label: 'Classic',
  canvasBg: '#000000',
  line: '#ffffff',
  ship: '#ffffff',
  shot: '#ffffff',
  powerUp: '#00ffff',
  thrust: 'rgba(255, 130, 0, 0.85)',
  hud: '#ffffff',
  hudDim: 'rgba(255,255,255,0.65)',
  particle: '255, 255, 255',
  glow: 0,
  pixelShot: false,
};

// Neo: neon outlines with a glow, on near-black. Accents from app/arcade.css.
const NEO: Skin = {
  label: 'Neo',
  canvasBg: '#0a0a0f',
  line: '#00f5ff', // --cyan
  ship: '#ff006e', // --magenta
  shot: '#f5ff00', // --yellow
  powerUp: '#00ff88', // --green
  thrust: '#f5ff00', // --yellow
  hud: '#e6e9ff', // --ink
  hudDim: '#8a8fb5', // --ink-dim
  particle: '0, 245, 255',
  glow: 10,
  pixelShot: false,
};

// Retro: three muted CRT colors (amber, phosphor green, rust), flat shapes, no glow.
const RETRO: Skin = {
  label: 'Retro',
  canvasBg: '#0d0d14',
  line: '#d9a441',
  ship: '#7fb069',
  shot: '#d9a441',
  powerUp: '#7fb069',
  thrust: '#c0523a',
  hud: '#d9a441',
  hudDim: '#a0783a',
  particle: '217, 164, 65',
  glow: 0,
  pixelShot: true,
};

export const SKINS: Record<SkinId, Skin> = {
  classic: CLASSIC,
  neo: NEO,
  retro: RETRO,
};
