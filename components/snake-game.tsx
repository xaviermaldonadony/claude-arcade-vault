'use client';

import { useEffect, useRef, useSyncExternalStore, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import type { TouchControls } from '@/lib/touch/controls';
import type { Dir } from '@/lib/snake/types';
import { FRUIT_SHEET } from '@/lib/snake/atlas';
import { attachKeyboard } from '@/lib/snake/input';
import { createGame, level, setPaused, step } from '@/lib/snake/engine';
import { drawGame } from '@/lib/snake/render';
import { SKIN_IDS, SKINS, isSkinId, type SkinId } from '@/lib/snake/skins';
import type { SnakeState } from '@/lib/snake/types';
import { CELL, COLS, ROWS } from '@/lib/snake/constants';

const SKIN_KEY = 'snake-skin';

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
const skinListeners = new Set<() => void>();
let skinCache: SkinId | null = null;

function subscribeSkin(onChange: () => void): () => void {
  skinListeners.add(onChange);
  return () => {
    skinListeners.delete(onChange);
  };
}

function readSkin(): SkinId {
  if (skinCache === null) skinCache = readStoredSkin() ?? 'classic';
  return skinCache;
}

// Classic on the server. The saved skin is read on the client.
const serverSkin = (): SkinId => 'classic';

function saveSkin(skin: SkinId): void {
  skinCache = skin;
  writeStoredSkin(skin);
  skinListeners.forEach((notify) => notify());
}

type Props = {
  // Touch state from the player page. Merged with the keyboard in step 4.
  touch: TouchControls;
  // Element for the SKIN select on phones (the bottom bar). Missing or null: the select stays inline.
  skinSlot?: HTMLElement | null;
  // Controlled by the player. true pauses the engine, false resumes it.
  paused: boolean;
  // Called when score, level, or length change.
  onStats: (stats: { score: number; level: number; length?: number }) => void;
  // Called once when the game reaches game over, with the final score.
  onEnd: (score: number) => void;
  // Called when P or Escape is pressed, so the player can toggle its paused state.
  onTogglePause?: () => void;
};

const TOUCH_TURNS: Dir[] = ['up', 'down', 'left', 'right'];

// First D-pad press since the last frame, as a turn. A keyboard turn wins when both arrive.
function takeTouchTurn(touch: TouchControls): Dir | null {
  for (const dir of TOUCH_TURNS) if (touch.takePress(dir)) return dir;
  return null;
}

export function SnakeGame({ paused, onStats, onEnd, onTogglePause, touch, skinSlot }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Classic on the server. The saved skin is read on the client.
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
    let state: SnakeState = createGame();
    let lastTs: number | null = null;
    let lastKey = '';
    let ended = false;
    let frameId = 0;

    // The sprite sheet loads in the background. Until it is ready the game draws the magenta fallback.
    let fruitImage: HTMLImageElement | null = null;
    const image = new Image();
    image.src = FRUIT_SHEET.path;
    image.onload = () => {
      fruitImage = image;
    };

    const frame = (ts: number) => {
      const dt = lastTs === null ? 0 : (ts - lastTs) / 1000;
      lastTs = ts;

      if (keyboard.takePausePress()) onTogglePauseRef.current?.();

      state = setPaused(state, pausedRef.current);
      state = step(
        state,
        {
          turn: keyboard.takeTurn() ?? takeTouchTurn(touchRef.current),
          boost: touchRef.current.held().has('a'),
        },
        dt,
      );

      const key = `${state.score}|${state.fruits}|${state.status}`;
      if (key !== lastKey) {
        lastKey = key;
        onStatsRef.current({
          score: state.score,
          level: level(state.fruits),
          length: state.body.length,
        });
      }
      if (state.status === 'gameover' && !ended) {
        ended = true;
        onEndRef.current(state.score);
      }

      drawGame(ctx, state, fruitImage, skinRef.current);
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      keyboard.detach();
      image.onload = null;
    };
  }, []);

  function handleSkinChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    if (!isSkinId(next)) return;
    saveSkin(next);
    // Drop focus so Space and the arrow keys keep controlling the game.
    e.target.blur();
  }

  // Fills the parent (the CRT screen arena). The canvas keeps its square ratio inside it, with the SKIN select below.
  // The SKIN select. Inline in the game screen, or in the phone bottom bar through skinSlot.
  const skinField = (
    <div
      className="field"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, margin: 0 }}
    >
      <label htmlFor="snake-skin">SKIN</label>
      <select
        id="snake-skin"
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
        width={COLS * CELL}
        height={ROWS * CELL}
        aria-label="Snake game field"
        style={{
          display: 'block',
          flex: '1 1 0',
          minHeight: 0,
          height: 0,
          maxWidth: '100%',
          aspectRatio: `${COLS} / ${ROWS}`,
          objectFit: 'contain',
          background: SKINS[skin].canvasBg,
        }}
      />

      {skinSlot ? createPortal(skinField, skinSlot) : skinField}
    </div>
  );
}
