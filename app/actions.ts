"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  players,
  games,
  gamePlayers,
  gameProperties,
  properties,
  transactions,
} from "@/db/schema";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const TOKEN_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user.id;
}

async function requireActiveGame(userId: string) {
  const [game] = await db
    .select()
    .from(games)
    .where(and(eq(games.userId, userId), eq(games.status, "active")))
    .limit(1);
  if (!game) throw new Error("Nenhuma partida ativa encontrada.");
  return game;
}

// ───────────────────────── Players (roster) ─────────────────────────

export async function createPlayer(formData: FormData) {
  const userId = await requireUser();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await db.insert(players).values({ userId, name });
  revalidatePath("/");
}

export async function deletePlayer(playerId: string) {
  const userId = await requireUser();
  await db
    .delete(players)
    .where(and(eq(players.id, playerId), eq(players.userId, userId)));
  revalidatePath("/");
}

// ───────────────────────── Games ─────────────────────────

export async function startGame(formData: FormData) {
  const userId = await requireUser();
  const startingBalance = Number(formData.get("startingBalance") || 30000);
  const passSalary = Number(formData.get("passSalary") || 2000);
  const playerIds = formData.getAll("playerIds").map(String);

  if (playerIds.length < 2) {
    throw new Error("Selecione pelo menos 2 jogadores.");
  }

  // Close any existing active game
  await db
    .update(games)
    .set({ status: "finished", finishedAt: new Date() })
    .where(and(eq(games.userId, userId), eq(games.status, "active")));

  const [newGame] = await db
    .insert(games)
    .values({ userId, startingBalance, passSalary })
    .returning();

  await db.insert(gamePlayers).values(
    playerIds.map((pid, idx) => ({
      gameId: newGame.id,
      playerId: pid,
      balance: startingBalance,
      color: TOKEN_COLORS[idx % TOKEN_COLORS.length],
    })),
  );

  // Bump totalGames for each player
  for (const pid of playerIds) {
    await db
      .update(players)
      .set({ totalGames: sql`${players.totalGames} + 1` })
      .where(eq(players.id, pid));
  }

  redirect("/jogo");
}

export async function endGame(formData: FormData) {
  const userId = await requireUser();
  const winnerId = String(formData.get("winnerId") || "");
  const game = await requireActiveGame(userId);
  await db
    .update(games)
    .set({
      status: "finished",
      finishedAt: new Date(),
      winnerPlayerId: winnerId || null,
    })
    .where(eq(games.id, game.id));
  if (winnerId) {
    await db
      .update(players)
      .set({ totalWins: sql`${players.totalWins} + 1` })
      .where(eq(players.id, winnerId));
  }
  redirect("/");
}

export async function cancelGame() {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);
  await db
    .update(games)
    .set({ status: "finished", finishedAt: new Date() })
    .where(eq(games.id, game.id));
  redirect("/");
}

// ───────────────────────── Transactions ─────────────────────────

async function adjustBalance(
  gameId: string,
  playerId: string,
  delta: number,
) {
  await db
    .update(gamePlayers)
    .set({ balance: sql`${gamePlayers.balance} + ${delta}` })
    .where(
      and(
        eq(gamePlayers.gameId, gameId),
        eq(gamePlayers.playerId, playerId),
      ),
    );
}

export async function transferBetweenPlayers(args: {
  fromPlayerId: string;
  toPlayerId: string;
  amount: number;
  description?: string;
}) {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);
  if (args.amount <= 0) throw new Error("Valor inválido.");
  await adjustBalance(game.id, args.fromPlayerId, -args.amount);
  await adjustBalance(game.id, args.toPlayerId, args.amount);
  await db.insert(transactions).values({
    gameId: game.id,
    fromPlayerId: args.fromPlayerId,
    toPlayerId: args.toPlayerId,
    amount: args.amount,
    type: "transfer",
    description: args.description || "Transferência entre jogadores",
  });
  revalidatePath("/jogo");
}

export async function payToBank(args: {
  playerId: string;
  amount: number;
  description?: string;
}) {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);
  if (args.amount <= 0) throw new Error("Valor inválido.");
  await adjustBalance(game.id, args.playerId, -args.amount);
  await db.insert(transactions).values({
    gameId: game.id,
    fromPlayerId: args.playerId,
    toPlayerId: null,
    amount: args.amount,
    type: "bank_in",
    description: args.description || "Pagamento ao banco",
  });
  revalidatePath("/jogo");
}

export async function receiveFromBank(args: {
  playerId: string;
  amount: number;
  description?: string;
}) {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);
  if (args.amount <= 0) throw new Error("Valor inválido.");
  await adjustBalance(game.id, args.playerId, args.amount);
  await db.insert(transactions).values({
    gameId: game.id,
    fromPlayerId: null,
    toPlayerId: args.playerId,
    amount: args.amount,
    type: "bank_out",
    description: args.description || "Recebimento do banco",
  });
  revalidatePath("/jogo");
}

export async function paySalary(playerId: string) {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);
  await adjustBalance(game.id, playerId, game.passSalary);
  await db.insert(transactions).values({
    gameId: game.id,
    fromPlayerId: null,
    toPlayerId: playerId,
    amount: game.passSalary,
    type: "salary",
    description: `Passou pela saída — recebeu $${game.passSalary.toLocaleString("pt-BR")}`,
  });
  revalidatePath("/jogo");
}

// ───────────────────────── Properties (in game) ─────────────────────────

export async function buyProperty(args: {
  playerId: string;
  propertyId: number;
}) {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);

  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, args.propertyId))
    .limit(1);
  if (!prop) throw new Error("Propriedade inexistente.");
  if (!prop.purchasePrice) throw new Error("Propriedade sem preço.");

  // Ensure row exists
  await db
    .insert(gameProperties)
    .values({
      gameId: game.id,
      propertyId: args.propertyId,
      ownerPlayerId: args.playerId,
    })
    .onConflictDoUpdate({
      target: [gameProperties.gameId, gameProperties.propertyId],
      set: { ownerPlayerId: args.playerId, isMortgaged: false },
    });

  await adjustBalance(game.id, args.playerId, -prop.purchasePrice);
  await db.insert(transactions).values({
    gameId: game.id,
    fromPlayerId: args.playerId,
    toPlayerId: null,
    amount: prop.purchasePrice,
    type: "purchase",
    description: `Comprou ${prop.name}`,
    propertyId: prop.id,
  });
  revalidatePath("/jogo");
}

export async function sellPropertyToBank(args: {
  playerId: string;
  propertyId: number;
}) {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);
  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, args.propertyId))
    .limit(1);
  if (!prop?.purchasePrice) throw new Error("Propriedade inválida.");

  // Pay back the purchase price (game-house rule simplification)
  await db
    .update(gameProperties)
    .set({ ownerPlayerId: null, houses: 0, hasHotel: false, isMortgaged: false })
    .where(
      and(
        eq(gameProperties.gameId, game.id),
        eq(gameProperties.propertyId, args.propertyId),
      ),
    );
  await adjustBalance(game.id, args.playerId, prop.purchasePrice);
  await db.insert(transactions).values({
    gameId: game.id,
    fromPlayerId: null,
    toPlayerId: args.playerId,
    amount: prop.purchasePrice,
    type: "sale",
    description: `Vendeu ${prop.name} ao banco`,
    propertyId: prop.id,
  });
  revalidatePath("/jogo");
}

export async function transferProperty(args: {
  fromPlayerId: string;
  toPlayerId: string;
  propertyId: number;
  amount: number;
}) {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);
  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, args.propertyId))
    .limit(1);
  if (!prop) throw new Error("Propriedade inválida.");

  await db
    .update(gameProperties)
    .set({ ownerPlayerId: args.toPlayerId })
    .where(
      and(
        eq(gameProperties.gameId, game.id),
        eq(gameProperties.propertyId, args.propertyId),
      ),
    );

  if (args.amount > 0) {
    await adjustBalance(game.id, args.fromPlayerId, args.amount);
    await adjustBalance(game.id, args.toPlayerId, -args.amount);
  }

  await db.insert(transactions).values({
    gameId: game.id,
    fromPlayerId: args.toPlayerId,
    toPlayerId: args.fromPlayerId,
    amount: args.amount,
    type: "transfer",
    description: `Transferiu ${prop.name}`,
    propertyId: prop.id,
  });
  revalidatePath("/jogo");
}

export async function payRent(args: {
  payerId: string;
  propertyId: number;
  diceSum?: number;
}) {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);

  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, args.propertyId))
    .limit(1);
  if (!prop) throw new Error("Propriedade inválida.");

  const [gp] = await db
    .select()
    .from(gameProperties)
    .where(
      and(
        eq(gameProperties.gameId, game.id),
        eq(gameProperties.propertyId, args.propertyId),
      ),
    )
    .limit(1);
  if (!gp?.ownerPlayerId) throw new Error("Propriedade sem dono.");
  if (gp.isMortgaged) throw new Error("Propriedade hipotecada — sem aluguel.");
  if (gp.ownerPlayerId === args.payerId) {
    throw new Error("Você é o dono dessa propriedade.");
  }

  let amount = 0;
  if (prop.isStock) {
    if (!args.diceSum || args.diceSum < 2 || args.diceSum > 12) {
      throw new Error("Informe a soma dos dados (2..12).");
    }
    amount = args.diceSum * (prop.stockMultiplier || 0);
  } else if (gp.hasHotel) {
    amount = prop.rentHotel || 0;
  } else if (gp.houses === 4) {
    amount = prop.rent4Houses || 0;
  } else if (gp.houses === 3) {
    amount = prop.rent3Houses || 0;
  } else if (gp.houses === 2) {
    amount = prop.rent2Houses || 0;
  } else if (gp.houses === 1) {
    amount = prop.rent1House || 0;
  } else {
    amount = prop.baseRent || 0;
  }

  if (amount <= 0) throw new Error("Aluguel é zero.");

  await adjustBalance(game.id, args.payerId, -amount);
  await adjustBalance(game.id, gp.ownerPlayerId, amount);
  await db.insert(transactions).values({
    gameId: game.id,
    fromPlayerId: args.payerId,
    toPlayerId: gp.ownerPlayerId,
    amount,
    type: "rent",
    description: prop.isStock
      ? `Aluguel ${prop.name} (dados=${args.diceSum})`
      : `Aluguel ${prop.name}`,
    propertyId: prop.id,
  });
  revalidatePath("/jogo");
}

export async function buildHouse(args: {
  playerId: string;
  propertyId: number;
}) {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);
  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, args.propertyId))
    .limit(1);
  if (!prop?.houseCost) throw new Error("Sem custo de casa.");

  const [gp] = await db
    .select()
    .from(gameProperties)
    .where(
      and(
        eq(gameProperties.gameId, game.id),
        eq(gameProperties.propertyId, args.propertyId),
      ),
    )
    .limit(1);
  if (!gp || gp.ownerPlayerId !== args.playerId) {
    throw new Error("Apenas o dono pode construir.");
  }
  if (gp.hasHotel) throw new Error("Já tem hotel.");
  if (gp.houses >= 4) throw new Error("Já tem 4 casas — construa um hotel.");

  await db
    .update(gameProperties)
    .set({ houses: gp.houses + 1 })
    .where(
      and(
        eq(gameProperties.gameId, game.id),
        eq(gameProperties.propertyId, args.propertyId),
      ),
    );
  await adjustBalance(game.id, args.playerId, -prop.houseCost);
  await db.insert(transactions).values({
    gameId: game.id,
    fromPlayerId: args.playerId,
    toPlayerId: null,
    amount: prop.houseCost,
    type: "build",
    description: `Construiu casa em ${prop.name} (${gp.houses + 1}/4)`,
    propertyId: prop.id,
  });
  revalidatePath("/jogo");
}

export async function buildHotel(args: {
  playerId: string;
  propertyId: number;
}) {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);
  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, args.propertyId))
    .limit(1);
  if (!prop?.hotelCost) throw new Error("Sem custo de hotel.");

  const [gp] = await db
    .select()
    .from(gameProperties)
    .where(
      and(
        eq(gameProperties.gameId, game.id),
        eq(gameProperties.propertyId, args.propertyId),
      ),
    )
    .limit(1);
  if (!gp || gp.ownerPlayerId !== args.playerId) {
    throw new Error("Apenas o dono pode construir.");
  }
  if (gp.hasHotel) throw new Error("Já tem hotel.");
  if (gp.houses < 4) throw new Error("Precisa de 4 casas antes do hotel.");

  await db
    .update(gameProperties)
    .set({ hasHotel: true, houses: 0 })
    .where(
      and(
        eq(gameProperties.gameId, game.id),
        eq(gameProperties.propertyId, args.propertyId),
      ),
    );
  await adjustBalance(game.id, args.playerId, -prop.hotelCost);
  await db.insert(transactions).values({
    gameId: game.id,
    fromPlayerId: args.playerId,
    toPlayerId: null,
    amount: prop.hotelCost,
    type: "build",
    description: `Construiu hotel em ${prop.name}`,
    propertyId: prop.id,
  });
  revalidatePath("/jogo");
}

export async function mortgageProperty(args: {
  playerId: string;
  propertyId: number;
}) {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);
  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, args.propertyId))
    .limit(1);
  if (!prop) throw new Error("Propriedade inválida.");

  const [gp] = await db
    .select()
    .from(gameProperties)
    .where(
      and(
        eq(gameProperties.gameId, game.id),
        eq(gameProperties.propertyId, args.propertyId),
      ),
    )
    .limit(1);
  if (!gp || gp.ownerPlayerId !== args.playerId)
    throw new Error("Apenas o dono pode hipotecar.");
  if (gp.isMortgaged) throw new Error("Já está hipotecada.");

  await db
    .update(gameProperties)
    .set({ isMortgaged: true })
    .where(
      and(
        eq(gameProperties.gameId, game.id),
        eq(gameProperties.propertyId, args.propertyId),
      ),
    );
  await adjustBalance(game.id, args.playerId, prop.mortgageValue);
  await db.insert(transactions).values({
    gameId: game.id,
    fromPlayerId: null,
    toPlayerId: args.playerId,
    amount: prop.mortgageValue,
    type: "mortgage",
    description: `Hipotecou ${prop.name}`,
    propertyId: prop.id,
  });
  revalidatePath("/jogo");
}

export async function unmortgageProperty(args: {
  playerId: string;
  propertyId: number;
}) {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);
  const [prop] = await db
    .select()
    .from(properties)
    .where(eq(properties.id, args.propertyId))
    .limit(1);
  if (!prop) throw new Error("Propriedade inválida.");

  const [gp] = await db
    .select()
    .from(gameProperties)
    .where(
      and(
        eq(gameProperties.gameId, game.id),
        eq(gameProperties.propertyId, args.propertyId),
      ),
    )
    .limit(1);
  if (!gp || gp.ownerPlayerId !== args.playerId)
    throw new Error("Apenas o dono pode resgatar.");
  if (!gp.isMortgaged) throw new Error("Não está hipotecada.");

  // Resgate = valor da hipoteca + 10%
  const cost = Math.round(prop.mortgageValue * 1.1);
  await db
    .update(gameProperties)
    .set({ isMortgaged: false })
    .where(
      and(
        eq(gameProperties.gameId, game.id),
        eq(gameProperties.propertyId, args.propertyId),
      ),
    );
  await adjustBalance(game.id, args.playerId, -cost);
  await db.insert(transactions).values({
    gameId: game.id,
    fromPlayerId: args.playerId,
    toPlayerId: null,
    amount: cost,
    type: "unmortgage",
    description: `Resgatou hipoteca de ${prop.name}`,
    propertyId: prop.id,
  });
  revalidatePath("/jogo");
}

export async function setBankrupt(playerId: string, isBankrupt: boolean) {
  const userId = await requireUser();
  const game = await requireActiveGame(userId);
  await db
    .update(gamePlayers)
    .set({ isBankrupt })
    .where(
      and(
        eq(gamePlayers.gameId, game.id),
        eq(gamePlayers.playerId, playerId),
      ),
    );
  // Return all their properties to the bank
  if (isBankrupt) {
    await db
      .update(gameProperties)
      .set({
        ownerPlayerId: null,
        houses: 0,
        hasHotel: false,
        isMortgaged: false,
      })
      .where(
        and(
          eq(gameProperties.gameId, game.id),
          eq(gameProperties.ownerPlayerId, playerId),
        ),
      );
  }
  revalidatePath("/jogo");
}
