'use client';

import { useEffect, useRef, useSyncExternalStore, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import type { TouchControls } from '@/lib/touch/controls';
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
  // Touch state from the player page. Merged with the keyboard in step 4.
  touch: TouchControls;
  // Element for the SKIN select on phones (the bottom bar). Missing or null: the select stays inline.
  skinSlot?: HTMLElement | null;
  // Controlled by the player. true pauses the engine, false resumes it.
  paused: boolean;
  // Called when score, lines, or level change.
  onStats: (stats: Stats) => void;
  // Called once when the game reaches game over, with the final score.
  onEnd: (score: number) => void;
  // Called when P or Escape is pressed, so the player can toggle its paused state.
  onTogglePause?: () => void;
};

// Holding the D-pad Down repeats soft drop at this interval, in seconds.
const TOUCH_SOFT_DROP_S = 0.05;

export function TetrisGame({ paused, onStats, onEnd, onTogglePause, touch, skinSlot }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Retro on the server. The saved skin is read on the client.
  const skin = useSyncExternalStore(subscribeSkin, readSkin, serverSkin);

  // Latest props, read by the frame loop without restarting it.
  const pausedRef = useRef(paused);
  const onStatsRef = useRef(onStats);
  const onEndRef = useRef(onEnd);
  const onTogglePauseRef = useRef(onTogglePause);
  const skinRef = useRef(skin);
  // The touch state never changes identity, so the frame loop reads it through a ref.
  const touchRef = useRef(touch);
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
    let downAcc = 0; // seconds since the last touch soft drop
    let ended = false;
    let frameId = 0;

    const frame = (ts: number) => {
      const dt = lastTs === null ? 0 : (ts - lastTs) / 1000;
      lastTs = ts;

      if (keyboard.takePausePress()) onTogglePauseRef.current?.();

      state = setPaused(state, pausedRef.current);
      const k = keyboard.read();
      const t = touchRef.current;
      // Each touch press is consumed once per frame, so call every takePress.
      const tLeft = t.takePress('left');
      const tRight = t.takePress('right');
      const tRotate = t.takePress('up');
      const tDrop = t.takePress('b');
      const tA = t.takePress('a');
      const downPressed = t.takePress('down');
      const downHeld = t.held().has('down');
      downAcc = downHeld ? downAcc + dt : 0;
      let tSoft = false;
      if (downPressed || (downHeld && downAcc >= TOUCH_SOFT_DROP_S)) {
        tSoft = true;
        downAcc = 0;
      }
      state = step(
        state,
        {
          left: k.left || tLeft,
          right: k.right || tRight,
          rotate: k.rotate || tRotate || tA,
          softDrop: k.softDrop || tSoft,
          hardDrop: k.hardDrop || tDrop,
        },
        dt,
      );

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
  // The SKIN select. Inline in the game screen, or in the phone bottom bar through skinSlot.
  const skinField = (
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
  );

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

      {skinSlot ? createPortal(skinField, skinSlot) : skinField}
    </div>
  );
}
