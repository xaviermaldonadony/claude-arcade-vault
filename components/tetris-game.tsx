'use client';

import { useEffect, useRef, useSyncExternalStore, type ChangeEvent } from 'react';
import { BLOCK, COLS, ROWS } from '@/lib/tetris/constants';
import { createGame, setPaused, step } from '@/lib/tetris/engine';
import { attachKeyboard } from '@/lib/tetris/input';
import { drawTetris } from '@/lib/tetris/render';
import { SKIN_IDS, SKINS, isSkinId, type SkinId } from '@/lib/tetris/skins';
import type { TetrisState } from '@/lib/tetris/types';

// Board on the left, 120 px NEXT column on the right.
const CANVAS_W = COLS * BLOCK + 120;
const CANVAS_H = ROWS * BLOCK;
const SKIN_KEY = 'tetris-skin';

const COARSE_QUERY = '(pointer: coarse)';

function subscribeCoarse(onChange: () => void): () => void {
  const mq = window.matchMedia(COARSE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

const readCoarse = (): boolean => window.matchMedia(COARSE_QUERY).matches;
// Server render assumes a fine pointer, so hydration matches and the note appears only on the client.
const serverCoarse = (): boolean => false;

// Storage can be blocked (private mode, disabled cookies). Then the skin simply does not persist.
function readStoredSkin(): SkinId | null {
  try {
    const value = localStorage.getItem(SKIN_KEY);
    return isSkinId(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredSkin(skin: SkinId): void {
  try {
    localStorage.setItem(SKIN_KEY, skin);
  } catch {
    // Not saved. The skin still applies for this visit.
  }
}

// Skin preference as an external store, so the select and the frame loop read the same value.
// The cache holds the choice even when storage is blocked. Server render always uses Retro.
const skinListeners = new Set<() => void>();
let skinCache: SkinId | null = null;

function subscribeSkin(onChange: () => void): () => void {
  skinListeners.add(onChange);
  return () => {
    skinListeners.delete(onChange);
  };
}

function readSkin(): SkinId {
  if (skinCache === null) skinCache = readStoredSkin() ?? 'retro';
  return skinCache;
}

const serverSkin = (): SkinId => 'retro';

function saveSkin(skin: SkinId): void {
  skinCache = skin;
  writeStoredSkin(skin);
  skinListeners.forEach((notify) => notify());
}

type Stats = { score: number; lines: number; level: number };

type Props = {
  // Controlled by the player. true pauses the engine, false resumes it.
  paused: boolean;
  // Called when score, lines, or level change.
  onStats: (stats: Stats) => void;
  // Called once when the game reaches game over, with the final score.
  onEnd: (score: number) => void;
  // Called when P or Escape is pressed, so the player can toggle its paused state.
  onTogglePause?: () => void;
};

export function TetrisGame({ paused, onStats, onEnd, onTogglePause }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Coarse pointer means a touch device. Touch controls are out of scope.
  const needsKeyboard = useSyncExternalStore(subscribeCoarse, readCoarse, serverCoarse);

  // Retro on the server. The saved skin is read on the client.
  const skin = useSyncExternalStore(subscribeSkin, readSkin, serverSkin);

  // Latest props, read by the frame loop without restarting it.
  const pausedRef = useRef(paused);
  const onStatsRef = useRef(onStats);
  const onEndRef = useRef(onEnd);
  const onTogglePauseRef = useRef(onTogglePause);
  const skinRef = useRef(skin);
  useEffect(() => {
    pausedRef.current = paused;
    onStatsRef.current = onStats;
    onEndRef.current = onEnd;
    onTogglePauseRef.current = onTogglePause;
    skinRef.current = skin;
  }, [paused, onStats, onEnd, onTogglePause, skin]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const keyboard = attachKeyboard(window);
    let state: TetrisState = createGame();
    let lastTs: number | null = null;
    let lastScore = -1;
    let lastLines = -1;
    let lastLevel = -1;
    let ended = false;
    let frameId = 0;

    const frame = (ts: number) => {
      const dt = lastTs === null ? 0 : (ts - lastTs) / 1000;
      lastTs = ts;

      if (keyboard.takePausePress()) onTogglePauseRef.current?.();

      state = setPaused(state, pausedRef.current);
      state = step(state, keyboard.read(), dt);

      if (state.score !== lastScore || state.lines !== lastLines || state.level !== lastLevel) {
        lastScore = state.score;
        lastLines = state.lines;
        lastLevel = state.level;
        onStatsRef.current({ score: state.score, lines: state.lines, level: state.level });
      }
      if (state.status === 'gameover' && !ended) {
        ended = true;
        onEndRef.current(state.score);
      }

      drawTetris(ctx, state, ts, skinRef.current);
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      keyboard.detach();
    };
  }, []);

  function handleSkinChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (!isSkinId(next)) return;
    saveSkin(next);
    // Drop focus so Space and the arrow keys keep controlling the game.
    e.target.blur();
  }

  // Fills the parent (the CRT screen arena). The canvas keeps its 420 by 600 ratio inside it.
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 12,
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        aria-label="Tetris game field"
        style={{
          display: 'block',
          flex: '1 1 0',
          minHeight: 0,
          height: 0,
          maxWidth: '100%',
          aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
          background: '#000',
        }}
      />

      <div
        className="field"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, margin: 0 }}
      >
        <label htmlFor="tetris-skin">SKIN</label>
        <select
          id="tetris-skin"
          value={skin}
          onChange={handleSkinChange}
          style={{
            height: 32,
            background: 'var(--bg)',
            color: 'var(--ink)',
            border: '1px solid var(--line)',
            padding: '0 8px',
            fontFamily: 'var(--mono)',
            fontSize: 12,
          }}
        >
          {SKIN_IDS.map((id) => (
            <option key={id} value={id}>
              {SKINS[id].label}
            </option>
          ))}
        </select>
      </div>

      {needsKeyboard && (
        <p
          style={{
            margin: 0,
            textAlign: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            letterSpacing: '0.16em',
            color: 'var(--ink-dim)',
          }}
        >
          THIS GAME NEEDS A KEYBOARD
        </p>
      )}
    </div>
  );
}
