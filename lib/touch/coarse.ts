// Coarse pointer means a finger-driven screen (phone or tablet). The player page reads it to show the D-pad.
// Client-only: touches window.matchMedia, so call it from useSyncExternalStore.
const COARSE_QUERY = '(pointer: coarse)';

export function subscribeCoarse(onChange: () => void): () => void {
  const mq = window.matchMedia(COARSE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export const readCoarse = (): boolean => window.matchMedia(COARSE_QUERY).matches;

// Server render assumes a fine pointer, so hydration matches and the D-pad appears only on the client.
export const serverCoarse = (): boolean => false;
