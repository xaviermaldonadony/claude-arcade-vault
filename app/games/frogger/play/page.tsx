'use client';

// SPEC frogger-core, step 8: dedicated play page for Frogger. The canvas loads client-side only (ssr: false).
// Scores are saved with POST /api/scores, the same path as the other games.
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const FroggerGame = dynamic(
  () => import('@/components/games/FroggerGame').then((m) => m.FroggerGame),
  { ssr: false },
);

const GAME_ID = 'frogger';
const NAME_KEY = 'av_player_name';
const MAX_NAME_LENGTH = 10;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function FroggerPlayPage() {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  // Pre-fill the name from the last game. The name input only renders after game over (client-only), so the server render never shows it.
  const [name, setName] = useState(() =>
    typeof window === 'undefined' ? '' : (localStorage.getItem(NAME_KEY) ?? ''),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Lock background scroll while the game-over modal is open.
  useEffect(() => {
    if (!over) return;
    document.body.classList.add('av-modal-open');
    return () => document.body.classList.remove('av-modal-open');
  }, [over]);

  const restart = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaveStatus('idle');
    setGameKey((k) => k + 1);
  };

  // The button is disabled while the request is open and after a save, so one game saves once.
  const submit = async () => {
    const finalName = name.trim().slice(0, MAX_NAME_LENGTH) || 'GUEST';
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: GAME_ID, name: finalName, score }),
        cache: 'no-store',
      });
      if (res.status !== 201) {
        setSaveStatus('error');
        return;
      }
      localStorage.setItem(NAME_KEY, finalName);
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  return (
    <div className="av-player">
      <div className="player-hud">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="l">Score</div>
            <div className="v">{score.toLocaleString('en-US')}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Lives</div>
            <div className="v">{'♥ '.repeat(lives).trim() || '—'}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Level</div>
            <div className="v">{String(level).padStart(2, '0')}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="btn yellow"
            disabled={over}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? 'RESUME' : 'PAUSE'}
          </button>
          <Link href="/games/frogger" className="btn ghost">
            EXIT
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <div className="game-arena">
            <FroggerGame
              key={gameKey}
              paused={paused || over}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setLevel}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                setOver(true);
              }}
            />
          </div>
          {paused && !over && (
            <div className="crt-content" style={{ background: 'rgba(0,0,0,0.6)', zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  PAUSED
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-dim)',
                    marginTop: 10,
                    letterSpacing: '0.16em',
                  }}
                >
                  PRESS RESUME TO CONTINUE
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SIGNAL OK</span>
          <span>FROGGER · CRT-83 · 60 HZ</span>
          <span>LOAD · 1MB</span>
        </div>
      </div>

      {over &&
        createPortal(
          <div className="modal-bd">
            <div className="modal">
              <h2>GAME OVER</h2>
              <div className="final-label">FINAL SCORE</div>
              <div className="final">{score.toLocaleString('en-US')}</div>
              {saveStatus === 'saved' ? (
                <div>SCORE SAVED</div>
              ) : (
                <>
                  <div className="input-row">
                    <input
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value.toUpperCase().slice(0, MAX_NAME_LENGTH))
                      }
                      placeholder="YOUR INITIALS"
                      aria-label="Player name"
                      disabled={saveStatus === 'saving'}
                    />
                    <button
                      type="button"
                      className="btn yellow"
                      disabled={saveStatus === 'saving'}
                      onClick={submit}
                    >
                      {saveStatus === 'saving' ? 'SAVING' : 'SAVE SCORE'}
                    </button>
                  </div>
                  {saveStatus === 'error' && (
                    <div style={{ color: 'var(--magenta)', marginTop: 10 }}>
                      COULD NOT SAVE. TRY AGAIN
                    </div>
                  )}
                </>
              )}
              <div className="actions">
                <button type="button" className="btn" onClick={restart}>
                  PLAY AGAIN
                </button>
                <Link href="/" className="btn magenta">
                  BACK TO THE VAULT
                </Link>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
