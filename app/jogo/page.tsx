import { auth } from "@/auth";
import { db } from "@/db";
import {
  games,
  gamePlayers,
  gameProperties,
  players,
  properties,
  transactions,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import GameClient from "./game-client";

export default async function GamePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [game] = await db
    .select()
    .from(games)
    .where(and(eq(games.userId, userId), eq(games.status, "active")))
    .limit(1);
  if (!game) redirect("/");

  const gpRows = await db
    .select({
      playerId: gamePlayers.playerId,
      balance: gamePlayers.balance,
      color: gamePlayers.color,
      isBankrupt: gamePlayers.isBankrupt,
      name: players.name,
    })
    .from(gamePlayers)
    .innerJoin(players, eq(gamePlayers.playerId, players.id))
    .where(eq(gamePlayers.gameId, game.id));

  const allProps = await db
    .select()
    .from(properties)
    .orderBy(properties.cardNumber);

  const ownedRows = await db
    .select()
    .from(gameProperties)
    .where(eq(gameProperties.gameId, game.id));

  const txs = await db
    .select()
    .from(transactions)
    .where(eq(transactions.gameId, game.id))
    .orderBy(desc(transactions.createdAt))
    .limit(50);

  return (
    <GameClient
      game={game}
      players={gpRows}
      properties={allProps}
      ownership={ownedRows}
      transactions={txs}
    />
  );
}
