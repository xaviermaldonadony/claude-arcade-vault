'use client';

import { useEffect, useRef, useSyncExternalStore, type ChangeEvent } from 'react';
import type { TouchControls } from '@/lib/touch/controls';
import { H, TOUCH_PADDLE_SPEED, W } from '@/lib/arkanoid/constants';
import { createGame, setPaused, step } from '@/lib/arkanoid/engine';
import { attachKeyboard } from '@/lib/arkanoid/input';
import { drawGame, loadSprites } from '@/lib/arkanoid/render';
import { SKIN_IDS, SKINS, isSkinId, type SkinId } from '@/lib/arkanoid/skins';
import type { ArkanoidState } from '@/lib/arkanoid/types';

const SPRITE_SHEET_SRC = '/arkanoid/spritesheet-breakout.png';
const REBOUND_SRC = '/arkanoid/sounds/rebound.mp3';
const DESTROY_SRC = '/arkanoid/sounds/destroy.mp3';
const SKIN_KEY = 'arkanoid-skin';

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
// The cache holds the choice even when storage is blocked. Server render always uses Classic.
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

const serverSkin = (): SkinId => 'classic';

function saveSkin(skin: SkinId): void {
  skinCache = skin;
  writeStoredSkin(skin);
  skinListeners.forEach((notify) => notify());
}

type Props = {
  // Touch state from the player page. Merged with the keyboard in step 4.
  touch: TouchControls;
  // Controlled by the player. true pauses the engine, false resumes it.
  paused: boolean;
  // Called when score, lives, or level change.
  onStats: (stats: { score: number; lives: number; level: number }) => void;
  // Called once at game over or after the last level is cleared, with the final score.
  onEnd: (score: number) => void;
  // Called when P or Escape is pressed, so the player can toggle its paused state.
  onTogglePause?: () => void;
};

// Plays a fresh copy so overlapping sounds do not cut each other off.
// Browsers may refuse playback before a user gesture; that error is ignored.
function playCopy(source: HTMLAudioElement): void {
  const copy = source.cloneNode() as HTMLAudioElement;
  copy.play().catch(() => {});
}

export function ArkanoidGame({ paused, onStats, onEnd, onTogglePause, touch }: Props) {
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
    let state: ArkanoidState = createGame();
    let sheet: HTMLImageElement | null = null;
    let cancelled = false;
    let frameId = 0;
    let lastTs: number | null = null;
    let lastScore = -1;
    let lastLives = -1;
    let lastLevel = -1;
    let ended = false;

    // Mouse x in canvas coordinates. Set on mousemove, sent with the next frame only,
    // so the keys keep working while the mouse rests over the canvas.
    let pointerX: number | null = null;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = (e.clientX - rect.left) * (canvas.width / rect.width);
    };
    canvas.addEventListener('mousemove', onMouseMove);

    const rebound = new Audio(REBOUND_SRC);
    const destroy = new Audio(DESTROY_SRC);

    const frame = (ts: number) => {
      if (!sheet) return;
      const dt = lastTs === null ? 0 : (ts - lastTs) / 1000;
      lastTs = ts;

      if (keyboard.takePausePress()) onTogglePauseRef.current?.();

      state = setPaused(state, pausedRef.current);
      const k = keyboard.read();
      const held = touchRef.current.held();
      const input = {
        left: k.left || held.has('left'),
        right: k.right || held.has('right'),
        pointerX,
        // The D-pad moves the paddle faster than the keyboard (SPEC 10).
        paddleSpeed: held.has('left') || held.has('right') ? TOUCH_PADDLE_SPEED : undefined,
      };
      pointerX = null;
      state = step(state, input, dt);

      for (const sound of state.sounds) playCopy(sound === 'break' ? destroy : rebound);

      if (state.score !== lastScore || state.lives !== lastLives || state.level !== lastLevel) {
        lastScore = state.score;
        lastLives = state.lives;
        lastLevel = state.level;
        onStatsRef.current({ score: state.score, lives: state.lives, level: state.level });
      }
      if ((state.status === 'gameover' || state.status === 'won') && !ended) {
        ended = true;
        onEndRef.current(state.score);
      }

      drawGame(ctx, sheet, state, skinRef.current);
      frameId = requestAnimationFrame(frame);
    };

    // The loop starts only after the sprite sheet is ready, so the first draw never fails.
    loadSprites(SPRITE_SHEET_SRC)
      .then((img) => {
        if (cancelled) return;
        sheet = img;
        frameId = requestAnimationFrame(frame);
      })
      .catch((err: unknown) => console.error(err));

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('mousemove', onMouseMove);
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

  // Fills the parent (the CRT screen arena). The canvas keeps its 4:3 ratio inside it.
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
        width={W}
        height={H}
        aria-label="Arkanoid game field"
        style={{
          display: 'block',
          flex: '1 1 0',
          minHeight: 0,
          height: 0,
          maxWidth: '100%',
          aspectRatio: `${W} / ${H}`,
          background: SKINS[skin].canvasBg,
        }}
      />

      <div
        className="field"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, margin: 0 }}
      >
        <label htmlFor="arkanoid-skin">SKIN</label>
        <select
          id="arkanoid-skin"
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
    </div>
  );
}
