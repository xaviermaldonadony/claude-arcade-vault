// Mock data for the visual MVP. Ported from references/templates/data.jsx.
// Static on purpose: a typed module is the seam later specs will replace with a backend.

export type Game = {
  id: string; // URL slug, e.g. "block-buster"
  title: string; // uppercase display name
  short: string;
  long: string;
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // CSS class name, e.g. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number; // global best score
  plays: string; // display string, e.g. "12.4K"
};

export type ScoreRow = { rank: number; name: string; score: number; date: string };

export const GAMES: Game[] = [
  {
    id: "block-buster",
    title: "BLOCK BUSTER",
    short: "Bounce the ball and smash neon walls.",
    long: "Pilot a paddle ship and bounce a plasma core to pulverize walls of chromatic blocks. Each level rearranges the grid into impossible patterns. How far can your streak go?",
    cat: "ARCADE",
    cover: "cover-bricks",
    color: "cyan",
    best: 28450,
    plays: "12.4K",
  },
  {
    id: "fall",
    title: "FALL",
    short: "Fit the pieces before the ceiling crushes you.",
    long: "Geometric pieces descend from the darkness. Rotate them, slot them in, and clear lines to survive. The speed ramps up mercilessly every 10 lines.",
    cat: "PUZZLE",
    cover: "cover-tetro",
    color: "magenta",
    best: 184220,
    plays: "31.8K",
  },
  {
    id: "serpentine",
    title: "SERPENTINE",
    short: "Grow without biting your own tail.",
    long: "A snake of light roams the grid hunting magenta cores. Every bite makes it longer and faster. One wrong move and it devours itself.",
    cat: "ARCADE",
    cover: "cover-snake",
    color: "green",
    best: 7820,
    plays: "9.1K",
  },
  {
    id: "glutton",
    title: "GLUTTON",
    short: "Devour points and escape the ghosts.",
    long: "A hungry circle patrols a maze collecting glowing dots. Four specters chase it, but every so often a pill appears that reverses the roles.",
    cat: "ARCADE",
    cover: "cover-glutton",
    color: "yellow",
    best: 96400,
    plays: "27.2K",
  },
  {
    id: "invaders",
    title: "INVADERS",
    short: "Defend the planet from alien rows.",
    long: "Waves of hostile pixels descend formation after formation. Move your cannon horizontally and open fire with precision before they reach the surface.",
    cat: "SHOOTER",
    cover: "cover-invaders",
    color: "green",
    best: 54190,
    plays: "18.0K",
  },
  {
    id: "rocks",
    title: "ROCKS",
    short: "Pulverize asteroids in zero gravity.",
    long: "Your triangular ship drifts through absolute vacuum. Shoot and rotate to split rocks into ever-smaller fragments. Watch out for UFOs on the horizon.",
    cat: "SHOOTER",
    cover: "cover-rocks",
    color: "yellow",
    best: 41200,
    plays: "15.6K",
  },
  {
    id: "frogrun",
    title: "FROGRUN",
    short: "Cross the pixel highway.",
    long: "Hop between lanes of speeding cars and drifting logs on the river. Reach the lily pads before time runs out.",
    cat: "ARCADE",
    cover: "cover-frog",
    color: "green",
    best: 18900,
    plays: "6.4K",
  },
  {
    id: "pixel-duel",
    title: "PIXEL DUEL",
    short: "Two paddles. One ball. Maximum reflexes.",
    long: "The purest duel: two vertical paddles face off to bounce a glowing ball. Solo mode against the CPU or local two-player matches.",
    cat: "VERSUS",
    cover: "cover-duel",
    color: "cyan",
    best: 24,
    plays: "4.2K",
  },
];

export const CATS: string[] = ["ALL", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];

export const PLAYERS: string[] = [
  "PX_KAI", "NEONFOX", "Z3R0COOL", "M00NRYU", "VAULT_07", "GLITCHA",
  "ATARI_KID", "CYBER_LU", "MAGENTA88", "SCANLINE", "BIT_LORD", "ARKADYA",
  "DROID_X", "RGB_QUEEN", "PIXEL_DAD", "RETROVIRA", "VECTORX", "JOY_STK",
];

// Deterministic: same seed and count always return the same rows, so server and client render identically.
export function seededScores(seed: number, count = 12): ScoreRow[] {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const used = new Set<string>();
  const rows: ScoreRow[] = [];
  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = PLAYERS[Math.floor(rand() * PLAYERS.length)];
    } while (used.has(name) && used.size < PLAYERS.length);
    used.add(name);
    const base = Math.floor(50000 + rand() * 250000);
    const score = base - i * Math.floor(2000 + rand() * 4000);
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    const mon = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    rows.push({ rank: i + 1, name, score: Math.max(score, 1000), date: `${day}/${mon}/2026` });
  }
  return rows
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

// ===== Home and About: static mock data (SPEC 02). Not read from GAMES or storage. =====

export type Tone = "cyan" | "magenta" | "yellow" | "green";

export type ActivityRow = {
  player: string;
  game: string;
  score: number;
  ago: string; // display string, e.g. "2 min ago"
  tone: Tone;
};

export type TopPlayer = {
  rank: number; // 1 to 5
  name: string;
  score: number;
};

export type Stat = {
  value: string; // e.g. "12+", "THOUSANDS"
  unit: string; // e.g. "GAMES"
  note: string; // e.g. "AND COUNTING"
};

export type Feature = {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  title: string;
  body: string;
  tone: Tone;
};

// Game names are kept as in the template, translated to the English GAMES titles where they match.
// "Ranaria" maps to FROGRUN (same score). The template's names that do not match GAMES are a later copy fix.
export const ACTIVITY: ActivityRow[] = [
  { player: "NEONFOX", game: "Fall", score: 184220, ago: "2 min ago", tone: "magenta" },
  { player: "PX_KAI", game: "Glutton", score: 96400, ago: "5 min ago", tone: "yellow" },
  { player: "Z3R0COOL", game: "Invaders", score: 54190, ago: "8 min ago", tone: "green" },
  { player: "VAULT_07", game: "Rocks", score: 41200, ago: "12 min ago", tone: "cyan" },
  { player: "GLITCHA", game: "Block Buster", score: 28450, ago: "18 min ago", tone: "cyan" },
  { player: "ARKADYA", game: "Serpentine", score: 7820, ago: "24 min ago", tone: "green" },
  { player: "CYBER_LU", game: "Frogrun", score: 18900, ago: "31 min ago", tone: "yellow" },
];

export const TOP_PLAYERS: TopPlayer[] = [
  { rank: 1, name: "NEONFOX", score: 312840 },
  { rank: 2, name: "PX_KAI", score: 248110 },
  { rank: 3, name: "M00NRYU", score: 196720 },
  { rank: 4, name: "VAULT_07", score: 154300 },
  { rank: 5, name: "GLITCHA", score: 138900 },
];

export const STATS: Stat[] = [
  { value: "12+", unit: "GAMES", note: "AND COUNTING" },
  { value: "THOUSANDS", unit: "OF RUNS", note: "PLAYED EVERY DAY" },
  { value: "GLOBAL", unit: "RANKING", note: "COMPETE WITH THE WORLD" },
];

export const FEATURES: Feature[] = [
  {
    icon: "GAMEPAD",
    title: "CLASSIC GAMES",
    body: "Arkanoid, Tetris, Snake and many more. The best arcade classics of all time in one place.",
    tone: "cyan",
  },
  {
    icon: "FREE",
    title: "100% FREE",
    body: "No subscriptions, no hidden fees. Every game is free to play.",
    tone: "yellow",
  },
  {
    icon: "TROPHY",
    title: "LADDER BOARDS",
    body: "Compete with players from around the world. Climb the ranking and prove you are the best.",
    tone: "magenta",
  },
  {
    icon: "ROCKET",
    title: "ALWAYS GROWING",
    body: "We add new games constantly. Come back often, there is always something new to play.",
    tone: "green",
  },
];

export const ABOUT_HIGHLIGHTS: { icon: "HEART" | "BROWSER" | "PLANT"; text: string; tone: Tone }[] = [
  { icon: "HEART", text: "MADE WITH ❤️ FOR PLAYERS", tone: "magenta" },
  { icon: "BROWSER", text: "HTML GAMES — RUN IN ANY BROWSER", tone: "cyan" },
  { icon: "PLANT", text: "A PROJECT THAT KEEPS GROWING", tone: "green" },
];

// Plan card text. The stamp ("FREE / PLAY") and the CTA label are markup in the component.
export const PRICING = {
  label: "ONE PLAN",
  name: "VAULT PLAYER",
  amount: "$0",
  unit: "/ ALWAYS",
  tag: "NO TRICKS · NO FINE PRINT",
  items: [
    "✔ Access to all games",
    "✔ Global ranking and hall of fame",
    "✔ No ads between games",
    "✔ Save your scores",
    "✔ New games every month",
    "✔ Works in any browser",
  ],
  foot: "No card required. Ever.",
};

export const FAQ: { q: string; a: string }[] = [
  {
    q: "IS IT REALLY FREE?",
    a: 'Yes. Arcade Vault is a non-profit project made for love of the classics. There is no hidden "premium" version.',
  },
  {
    q: "DO I NEED AN ACCOUNT?",
    a: "No. You can play as a guest. To save your score and appear in the ranking, sign up in 10 seconds.",
  },
  {
    q: "HOW DO YOU KEEP GOING WITHOUT CHARGING?",
    a: "It is a community project. If you like it, share it. That is the only currency we accept.",
  },
];
