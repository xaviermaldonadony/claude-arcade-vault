// Static mock data for Home, About and pricing (SPEC 02). The game catalog and scores come from Supabase (SPEC 06).

export const CATS: string[] = ["ALL", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];

// ===== Home and About: static mock data (SPEC 02). Not read from the games table or storage. =====

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

// Game names are kept as in the template, translated to the English game titles where they match.
// "Ranaria" maps to FROGRUN (same score). The template's names that do not match a game title are a later copy fix.
export const ACTIVITY: ActivityRow[] = [
  { player: "NEONFOX", game: "Fall", score: 184220, ago: "2 min ago", tone: "magenta" },
  { player: "PX_KAI", game: "Glutton", score: 96400, ago: "5 min ago", tone: "yellow" },
  { player: "Z3R0COOL", game: "Invaders", score: 54190, ago: "8 min ago", tone: "green" },
  { player: "VAULT_07", game: "Asteroids", score: 41200, ago: "12 min ago", tone: "cyan" },
  { player: "GLITCHA", game: "Block Buster", score: 28450, ago: "18 min ago", tone: "cyan" },
  { player: "ARKADYA", game: "Snake", score: 7820, ago: "24 min ago", tone: "green" },
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
