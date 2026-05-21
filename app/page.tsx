import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { players, games, gamePlayers } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { createPlayer, deletePlayer, startGame, deleteGame } from "./actions";

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
      {/* Editorial header */}
      <header className="bg-ink text-cream rounded-b-[36px] px-5 pt-6 pb-8 sticky top-0 z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Brand mark — transparent, sits directly on the navy */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-mark.png"
              alt="Banco Imobiliário"
              className="w-14 h-14 object-contain shrink-0 -ml-1"
            />
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-widest uppercase opacity-70 bracket">
                banco bi
              </div>
              <h1 className="h-display text-[28px] mt-0.5 truncate">
                olá, {session.user.name?.split(" ")[0] || "anfitrião"}.
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {session.user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                className="w-9 h-9 rounded-full border-2 border-mint"
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
                className="font-mono text-[10px] uppercase tracking-widest text-cream/70 hover:text-cream"
              >
                sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="px-5 py-6 space-y-6 max-w-md mx-auto w-full">
        {activeGame && (
          <Link
            href="/jogo"
            className="block rounded-3xl bg-mint text-ink p-5 font-bold shadow-[6px_6px_0_var(--color-ink)] border-2 border-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--color-ink)] transition"
          >
            <div className="font-mono text-[10px] tracking-widest uppercase opacity-70 bracket">
              em andamento
            </div>
            <div className="text-2xl mt-1">▶ Continuar partida</div>
          </Link>
        )}

        {/* Roster section */}
        <section className="bg-cream-soft rounded-3xl p-5 border-2 border-ink/10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="font-mono text-[10px] tracking-widest uppercase opacity-60 bracket">
                roster
              </div>
              <h2 className="h-display text-[28px] mt-1">jogadores</h2>
            </div>
            <div className="font-mono text-[11px] opacity-60">
              {roster.length} salvos
            </div>
          </div>

          <form action={createPlayer} className="flex gap-2 mb-4">
            <input
              name="name"
              placeholder="Nome do jogador"
              required
              className="flex-1 px-4 py-3 rounded-2xl border-2 border-ink/10 bg-cream focus:outline-none focus:border-ink"
            />
            <button
              type="submit"
              className="px-4 py-3 rounded-2xl bg-ink text-cream font-bold active:scale-95"
            >
              +
            </button>
          </form>

          <ul className="space-y-2">
            {roster.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between bg-cream rounded-2xl px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-ink text-cream grid place-items-center font-bold shrink-0">
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold leading-tight truncate">
                      {p.name}
                    </div>
                    <div className="font-mono text-[13px] tracking-wide opacity-80 leading-tight mt-0.5">
                      🏆 <span className="font-bold">{p.totalWins}</span>
                      <span className="opacity-50"> · {p.totalGames}g</span>
                    </div>
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
                    className="font-mono text-[10px] uppercase tracking-wider text-crimson/70 hover:text-crimson"
                  >
                    remover
                  </button>
                </form>
              </li>
            ))}
            {roster.length === 0 && (
              <li className="text-sm opacity-60 italic px-1">
                Nenhum jogador cadastrado.
              </li>
            )}
          </ul>
        </section>

        {/* New game */}
        {!activeGame && roster.length >= 2 && (
          <section className="bg-mint text-ink rounded-3xl p-5 border-2 border-ink shadow-[6px_6px_0_var(--color-ink)]">
            <div className="font-mono text-[10px] tracking-widest uppercase opacity-70 bracket">
              nova partida
            </div>
            <h2 className="h-display text-[32px] mt-1 mb-4">quem joga?</h2>
            <form action={startGame} className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {roster.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-ink/10 cursor-pointer active:scale-[0.99]"
                  >
                    <input
                      type="checkbox"
                      name="playerIds"
                      value={p.id}
                      className="w-5 h-5 accent-ink"
                    />
                    <span className="font-bold">{p.name}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
                    saldo inicial
                  </span>
                  <input
                    name="startingBalance"
                    type="number"
                    defaultValue={30000}
                    step={1000}
                    className="mt-1 w-full px-3 py-2 rounded-xl border-2 border-ink/20 bg-cream/60 text-ink"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
                    salário (saída)
                  </span>
                  <input
                    name="passSalary"
                    type="number"
                    defaultValue={2000}
                    step={500}
                    className="mt-1 w-full px-3 py-2 rounded-xl border-2 border-ink/20 bg-cream/60 text-ink"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-ink text-cream font-black text-lg active:scale-[0.98] border-2 border-ink"
              >
                começar partida →
              </button>
            </form>
          </section>
        )}

        {/* History */}
        {finishedGames.length > 0 && (
          <section>
            <div className="font-mono text-[10px] tracking-widest uppercase opacity-60 bracket mb-2">
              histórico
            </div>
            <h2 className="h-display text-[24px] mb-3">partidas anteriores</h2>
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
    <li className="bg-cream-soft rounded-2xl px-4 py-3 border-2 border-ink/10">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] opacity-60 uppercase tracking-wider">
            {game.finishedAt
              ? new Date(game.finishedAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </div>
          <div className="text-sm font-bold mt-0.5 truncate">
            {ps.map((x) => x.name).join(" · ")}
          </div>
        </div>
        <div className="flex items-start gap-2 shrink-0">
          {winnerName && (
            <div className="font-mono text-[10px] uppercase tracking-widest bg-mint text-ink px-2 py-1 rounded-lg font-bold whitespace-nowrap">
              🏆 {winnerName}
            </div>
          )}
          <form
            action={async () => {
              "use server";
              await deleteGame(game.id);
            }}
          >
            <button
              type="submit"
              className="font-mono text-[14px] text-crimson/60 hover:text-crimson leading-none px-1"
              title="Apagar partida"
            >
              ×
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}
