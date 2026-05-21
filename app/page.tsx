import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { players, games, gamePlayers } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { createPlayer, deletePlayer, startGame } from "./actions";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const roster = await db
    .select()
    .from(players)
    .where(eq(players.userId, userId))
    .orderBy(desc(players.totalWins), players.name);

  const [activeGame] = await db
    .select()
    .from(games)
    .where(and(eq(games.userId, userId), eq(games.status, "active")))
    .limit(1);

  const finishedGames = await db
    .select()
    .from(games)
    .where(and(eq(games.userId, userId), eq(games.status, "finished")))
    .orderBy(desc(games.finishedAt))
    .limit(10);

  return (
    <main className="flex flex-col flex-1">
      <header className="bg-[#0b3d91] text-white px-5 py-4 flex items-center justify-between sticky top-0 z-10 shadow">
        <div>
          <div className="text-xs uppercase tracking-widest opacity-70">
            Super
          </div>
          <h1 className="text-xl font-black">Banco Imobiliário</h1>
        </div>
        <div className="flex items-center gap-3">
          {session.user.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt=""
              className="w-9 h-9 rounded-full border-2 border-white/30"
            />
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-xs text-white/70 hover:text-white"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <div className="px-5 py-6 space-y-6 max-w-md mx-auto w-full">
        {activeGame && (
          <Link
            href="/jogo"
            className="block rounded-2xl bg-yellow-400 text-[#0b3d91] p-5 font-bold shadow-md active:scale-[0.98]"
          >
            ▶ Continuar partida em andamento
          </Link>
        )}

        <section>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
            Jogadores salvos
          </h2>
          <form action={createPlayer} className="flex gap-2 mb-3">
            <input
              name="name"
              placeholder="Nome do jogador"
              required
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#0b3d91]"
            />
            <button
              type="submit"
              className="px-4 py-3 rounded-xl bg-[#0b3d91] text-white font-semibold active:scale-95"
            >
              Adicionar
            </button>
          </form>

          <ul className="space-y-2">
            {roster.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm"
              >
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-slate-500">
                    {p.totalWins} vitória{p.totalWins === 1 ? "" : "s"} ·{" "}
                    {p.totalGames} partida{p.totalGames === 1 ? "" : "s"}
                  </div>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deletePlayer(p.id);
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                  >
                    Remover
                  </button>
                </form>
              </li>
            ))}
            {roster.length === 0 && (
              <li className="text-sm text-slate-500 italic">
                Nenhum jogador cadastrado ainda.
              </li>
            )}
          </ul>
        </section>

        {!activeGame && roster.length >= 2 && (
          <section className="bg-white rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
              Nova partida
            </h2>
            <form action={startGame} className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {roster.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      name="playerIds"
                      value={p.id}
                      className="w-5 h-5 accent-[#0b3d91]"
                    />
                    <span className="font-medium">{p.name}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-500">Saldo inicial</span>
                  <input
                    name="startingBalance"
                    type="number"
                    defaultValue={30000}
                    step={1000}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500">Salário (saída)</span>
                  <input
                    name="passSalary"
                    type="number"
                    defaultValue={2000}
                    step={500}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-yellow-400 text-[#0b3d91] font-black text-lg active:scale-[0.98]"
              >
                Começar partida
              </button>
            </form>
          </section>
        )}

        {finishedGames.length > 0 && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
              Histórico de partidas
            </h2>
            <ul className="space-y-2">
              {finishedGames.map((g) => (
                <FinishedGameRow key={g.id} game={g} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

async function FinishedGameRow({
  game,
}: {
  game: { id: string; finishedAt: Date | null; winnerPlayerId: string | null };
}) {
  const ps = await db
    .select({ name: players.name })
    .from(gamePlayers)
    .innerJoin(players, eq(gamePlayers.playerId, players.id))
    .where(eq(gamePlayers.gameId, game.id));
  let winnerName: string | null = null;
  if (game.winnerPlayerId) {
    const [w] = await db
      .select({ name: players.name })
      .from(players)
      .where(eq(players.id, game.winnerPlayerId));
    winnerName = w?.name ?? null;
  }
  return (
    <li className="bg-white rounded-xl px-4 py-3 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-slate-500">
            {game.finishedAt
              ? new Date(game.finishedAt).toLocaleString("pt-BR")
              : "—"}
          </div>
          <div className="text-sm font-medium">
            {ps.map((x) => x.name).join(" · ")}
          </div>
        </div>
        {winnerName && (
          <div className="text-xs bg-yellow-100 text-yellow-800 font-semibold px-2 py-1 rounded-full">
            🏆 {winnerName}
          </div>
        )}
      </div>
    </li>
  );
}
