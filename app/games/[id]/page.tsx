import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { GameDetail } from '@/components/game-detail';
import { fetchGame } from '@/lib/supabase/games';

// Blocking route: `connection()` runs outside <Suspense>, so the page must not stream its shell first.
// notFound() then runs before streaming starts, and unknown ids return a real 404 (as in the old page).
export const instant = false;

// Server-only. Reads the game row at request time, so an unknown id gets a real 404 (SPEC 06, step 7).
// `connection()` keeps the page dynamic under cacheComponents. The top scores load in the client component.
export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  const game = await fetchGame(id);
  if (!game) notFound();

  return <GameDetail game={game} />;
}
