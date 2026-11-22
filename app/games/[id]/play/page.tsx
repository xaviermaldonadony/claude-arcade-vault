import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { GamePlayer } from '@/components/game-player';
import { fetchGame } from '@/lib/supabase/games';

// Blocking route: notFound() runs before streaming, so unknown ids return a real 404 (SPEC 06, step 8).
export const instant = false;

// Server-only. Reads the game at request time, the same way as the detail page. The player itself is a client component.
export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;

  const game = await fetchGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
