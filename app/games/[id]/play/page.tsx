import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { GAMES } from "@/lib/data";

// Prerender the known games. Unknown ids still render on request and hit notFound().
export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

// Blocking route: notFound() runs before streaming, so unknown ids return 404 (see streaming.md, Status codes).
export const instant = false;

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
