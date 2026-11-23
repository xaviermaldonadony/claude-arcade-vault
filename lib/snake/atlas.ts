// Fruit sprite atlas for the Snake game (SPEC 09). Ported from references/source-assets/sprites.js.
// Pure data: no window, no DOM. Coordinates are in pixels inside the sheet.

export type SpriteRect = { x: number; y: number; w: number; h: number };

export type FruitSprite = SpriteRect & { name: string };

export const FRUIT_SHEET = {
  // Served from public/snake/. The sheet has a transparent background.
  path: '/snake/fruits.png',
  width: 3790,
  height: 442,
} as const;

// The middle row of the sheet, y 136 to 295 (160 px tall). Index = food `kind` in the engine.
export const FRUIT_ATLAS: readonly FruitSprite[] = [
  { name: 'banana', x: 34, y: 136, w: 110, h: 160 },
  { name: 'orange', x: 186, y: 136, w: 150, h: 160 },
  { name: 'grape', x: 378, y: 136, w: 110, h: 160 },
  { name: 'garlic', x: 540, y: 136, w: 130, h: 160 },
  { name: 'eggplant', x: 712, y: 136, w: 130, h: 160 },
  { name: 'strawberry', x: 894, y: 136, w: 110, h: 160 },
  { name: 'cherry', x: 1066, y: 136, w: 110, h: 160 },
  { name: 'carrot', x: 1228, y: 136, w: 130, h: 160 },
  { name: 'mushroom', x: 1400, y: 136, w: 130, h: 160 },
  { name: 'broccoli', x: 1582, y: 136, w: 110, h: 160 },
  { name: 'watermelon', x: 1734, y: 136, w: 150, h: 160 },
  { name: 'pepper', x: 1906, y: 136, w: 150, h: 160 },
  { name: 'kiwi', x: 2068, y: 136, w: 170, h: 160 },
  { name: 'lemon', x: 2250, y: 136, w: 140, h: 160 },
  { name: 'peach', x: 2432, y: 136, w: 130, h: 160 },
  { name: 'peanut', x: 2604, y: 136, w: 130, h: 160 },
  { name: 'apple', x: 2786, y: 136, w: 110, h: 160 },
  { name: 'tomato', x: 2948, y: 136, w: 130, h: 160 },
  { name: 'berries', x: 3110, y: 136, w: 150, h: 160 },
  { name: 'grapes2', x: 3302, y: 136, w: 110, h: 160 },
  { name: 'pineapple', x: 3454, y: 136, w: 150, h: 160 },
  { name: 'melon', x: 3637, y: 136, w: 130, h: 160 },
];
