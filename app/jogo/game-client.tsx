"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney } from "@/lib/format";
import * as A from "../actions";
import type { Game, Property, GameProperty, Transaction } from "@/db/schema";

type PlayerRow = {
  playerId: string;
  balance: number;
  color: string;
  isBankrupt: boolean;
  name: string;
};

type Props = {
  game: Game;
  players: PlayerRow[];
  properties: Property[];
  ownership: GameProperty[];
  transactions: Transaction[];
};

type Sheet =
  | { kind: "player"; playerId: string }
  | { kind: "buy"; playerId: string }
  | { kind: "rent"; payerId: string }
  | { kind: "transfer"; fromId: string }
  | { kind: "bank-pay"; playerId: string }
  | { kind: "bank-receive"; playerId: string }
  | { kind: "manage"; playerId: string; propertyId: number }
  | { kind: "log" }
  | { kind: "end" }
  | null;

export default function GameClient({
  game,
  players,
  properties,
  ownership,
  transactions,
}: Props) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  const refresh = () => router.refresh();

  const propsById = new Map(properties.map((p) => [p.id, p]));
  const ownByProp = new Map(ownership.map((o) => [o.propertyId, o]));
  const propsByOwner = new Map<string, GameProperty[]>();
  for (const o of ownership) {
    if (o.ownerPlayerId) {
      if (!propsByOwner.has(o.ownerPlayerId)) propsByOwner.set(o.ownerPlayerId, []);
      propsByOwner.get(o.ownerPlayerId)!.push(o);
    }
  }

  return (
    <main className="flex flex-col flex-1 pb-32">
      <header className="bg-ink text-cream px-5 pt-5 pb-6 rounded-b-[36px] sticky top-0 z-20 flex items-center justify-between">
        <Link
          href="/"
          className="font-mono text-[10px] uppercase tracking-widest opacity-70 hover:opacity-100 shrink-0 w-12"
        >
          ← início
        </Link>
        <div className="flex flex-col items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-mark.png"
            alt="Banco Imobiliário"
            className="w-14 h-14 object-contain"
          />
          <div className="font-mono text-[10px] uppercase tracking-widest opacity-80 bracket">
            em jogo
          </div>
        </div>
        <button
          onClick={() => setSheet({ kind: "log" })}
          className="font-mono text-[10px] uppercase tracking-widest opacity-70 hover:opacity-100 shrink-0 w-12 text-right"
        >
          log
        </button>
      </header>

      <div className="px-4 py-5 space-y-3 max-w-md mx-auto w-full">
        {players.map((p, idx) => {
          const owned = propsByOwner.get(p.playerId) || [];
          // Alternate accent cards for visual rhythm
          const isAccent = idx % 3 === 1;
          const bg = isAccent ? "bg-ink text-cream" : "bg-cream-soft text-ink";
          return (
            <div
              key={p.playerId}
              className={`w-full rounded-3xl p-5 border-2 border-ink/10 ${bg} ${p.isBankrupt ? "opacity-40" : ""}`}
            >
              <button
                onClick={() =>
                  setSheet({ kind: "player", playerId: p.playerId })
                }
                className="w-full text-left active:scale-[0.99] transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-12 h-12 rounded-2xl grid place-items-center font-black text-xl shrink-0 border-2 border-ink"
                      style={{ backgroundColor: p.color, color: "#fff" }}
                    >
                      {p.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-widest opacity-60 bracket">
                        jogador
                      </div>
                      <div className="h-display text-2xl truncate">
                        {p.name}
                      </div>
                    </div>
                  </div>
                  {p.isBankrupt && (
                    <span className="font-mono text-[10px] uppercase tracking-widest bg-crimson text-cream px-2 py-1 rounded-lg font-bold">
                      falido
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">
                    saldo
                  </span>
                  <span
                    className={`h-display text-4xl ${p.balance < 0 ? (isAccent ? "text-crimson-soft" : "text-crimson") : ""}`}
                  >
                    {formatMoney(p.balance)}
                  </span>
                </div>
              </button>
              {owned.length > 0 && (
                <div className="mt-4 -mx-5 px-5 flex gap-2 overflow-x-auto pb-2 scroll-pl-5">
                  {owned.map((o) => {
                    const pr = propsById.get(o.propertyId)!;
                    return (
                      <MiniDeed
                        key={o.propertyId}
                        property={pr}
                        ownership={o}
                        accent={isAccent}
                        onClick={() =>
                          setSheet({
                            kind: "manage",
                            playerId: p.playerId,
                            propertyId: o.propertyId,
                          })
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={() => setSheet({ kind: "end" })}
          className="w-full mt-6 py-4 rounded-3xl bg-crimson text-cream font-bold active:scale-[0.98] border-2 border-ink shadow-[6px_6px_0_var(--color-ink)]"
        >
          Encerrar partida →
        </button>
      </div>

      {/* ─────── Bottom sheets ─────── */}

      {sheet?.kind === "player" && (
        <BottomSheet onClose={() => setSheet(null)}>
          <PlayerActions
            playerId={sheet.playerId}
            players={players}
            properties={properties}
            ownership={ownership}
            propsByOwner={propsByOwner}
            propsById={propsById}
            onAction={(s) => setSheet(s)}
            onClose={() => setSheet(null)}
          />
        </BottomSheet>
      )}

      {sheet?.kind === "buy" && (
        <BottomSheet onClose={() => setSheet(null)}>
          <BuyPropertySheet
            playerId={sheet.playerId}
            players={players}
            properties={properties}
            ownership={ownership}
            onDone={() => {
              setSheet(null);
              refresh();
            }}
          />
        </BottomSheet>
      )}

      {sheet?.kind === "rent" && (
        <BottomSheet onClose={() => setSheet(null)}>
          <PayRentSheet
            payerId={sheet.payerId}
            players={players}
            properties={properties}
            ownership={ownership}
            onDone={() => {
              setSheet(null);
              refresh();
            }}
          />
        </BottomSheet>
      )}

      {sheet?.kind === "transfer" && (
        <BottomSheet onClose={() => setSheet(null)}>
          <TransferSheet
            fromId={sheet.fromId}
            players={players}
            onDone={() => {
              setSheet(null);
              refresh();
            }}
          />
        </BottomSheet>
      )}

      {sheet?.kind === "bank-pay" && (
        <BottomSheet onClose={() => setSheet(null)}>
          <BankSheet
            mode="pay"
            playerId={sheet.playerId}
            onDone={() => {
              setSheet(null);
              refresh();
            }}
          />
        </BottomSheet>
      )}

      {sheet?.kind === "bank-receive" && (
        <BottomSheet onClose={() => setSheet(null)}>
          <BankSheet
            mode="receive"
            playerId={sheet.playerId}
            passSalary={game.passSalary}
            onDone={() => {
              setSheet(null);
              refresh();
            }}
          />
        </BottomSheet>
      )}

      {sheet?.kind === "manage" && (
        <BottomSheet onClose={() => setSheet(null)}>
          <ManagePropertySheet
            playerId={sheet.playerId}
            propertyId={sheet.propertyId}
            property={propsById.get(sheet.propertyId)!}
            ownership={ownByProp.get(sheet.propertyId)!}
            players={players}
            onDone={() => {
              setSheet(null);
              refresh();
            }}
          />
        </BottomSheet>
      )}

      {sheet?.kind === "log" && (
        <BottomSheet onClose={() => setSheet(null)}>
          <LogSheet transactions={transactions} players={players} properties={properties} />
        </BottomSheet>
      )}

      {sheet?.kind === "end" && (
        <BottomSheet onClose={() => setSheet(null)}>
          <EndGameSheet
            players={players}
            onCancel={() => setSheet(null)}
            onDone={() => {
              startTransition(() => {
                router.push("/");
              });
            }}
          />
        </BottomSheet>
      )}
    </main>
  );
}

// ─────────────────────── Reusable components ───────────────────────

function MiniDeed({
  property,
  ownership,
  onClick,
  accent = false,
}: {
  property: Property;
  ownership: GameProperty;
  onClick?: () => void;
  accent?: boolean;
}) {
  const isStock = property.isStock;
  return (
    <button
      onClick={onClick}
      className={`shrink-0 w-[124px] rounded-2xl overflow-hidden text-left active:scale-[0.97] transition border-2 border-ink ${accent ? "bg-cream text-ink" : "bg-cream"} ${ownership.isMortgaged ? "opacity-60" : ""}`}
    >
      <div className="h-6" style={{ backgroundColor: property.color }} />
      <div className="px-2.5 py-2 flex flex-col h-[92px]">
        <div className="font-mono text-[9px] uppercase tracking-widest opacity-50">
          {property.groupName}
        </div>
        <div className="text-[13px] font-bold leading-tight line-clamp-2 mt-0.5">
          {property.name}
        </div>
        <div className="mt-auto flex items-end justify-between gap-1">
          <div className="text-base leading-none">
            {isStock ? (
              <span title="Ações">📈</span>
            ) : ownership.hasHotel ? (
              <span title="Hotel">🏨</span>
            ) : ownership.houses > 0 ? (
              <span>{"🏠".repeat(ownership.houses)}</span>
            ) : (
              <span className="opacity-30 text-sm">—</span>
            )}
          </div>
          {ownership.isMortgaged && (
            <span className="font-mono text-[9px] uppercase tracking-widest font-bold bg-crimson text-cream px-1.5 py-0.5 rounded">
              hipot.
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function computeRent(
  property: Property,
  ownership: GameProperty,
  diceSum?: number,
): number {
  if (property.isStock) {
    return (diceSum || 0) * (property.stockMultiplier || 0);
  }
  if (ownership.hasHotel) return property.rentHotel || 0;
  if (ownership.houses === 4) return property.rent4Houses || 0;
  if (ownership.houses === 3) return property.rent3Houses || 0;
  if (ownership.houses === 2) return property.rent2Houses || 0;
  if (ownership.houses === 1) return property.rent1House || 0;
  return property.baseRent || 0;
}

function BottomSheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <button
        aria-label="Fechar"
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-cream rounded-t-[36px] p-6 max-h-[88vh] overflow-y-auto pb-10 border-t-2 border-x-2 border-ink">
        <div className="w-12 h-1.5 bg-ink/20 rounded-full mx-auto mb-5" />
        {children}
      </div>
    </div>
  );
}

function PrimaryButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="w-full py-3 rounded-2xl bg-ink text-cream font-bold active:scale-[0.98] disabled:opacity-50 border-2 border-ink"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className="w-full py-3 rounded-2xl bg-cream text-ink font-bold active:scale-[0.98] disabled:opacity-50 border-2 border-ink"
    >
      {children}
    </button>
  );
}

// ─────────────────────── Sheets ───────────────────────

function PlayerActions({
  playerId,
  players,
  properties,
  propsByOwner,
  propsById,
  onAction,
  onClose,
}: {
  playerId: string;
  players: PlayerRow[];
  properties: Property[];
  ownership: GameProperty[];
  propsByOwner: Map<string, GameProperty[]>;
  propsById: Map<number, Property>;
  onAction: (s: Sheet) => void;
  onClose: () => void;
}) {
  const me = players.find((x) => x.playerId === playerId)!;
  const owned = propsByOwner.get(playerId) || [];
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-full grid place-items-center text-white font-black text-2xl"
          style={{ backgroundColor: me.color }}
        >
          {me.name[0]?.toUpperCase()}
        </div>
        <div>
          <div className="font-bold text-lg">{me.name}</div>
          <div className="text-2xl font-black text-ink">
            {formatMoney(me.balance)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <PrimaryButton onClick={() => onAction({ kind: "rent", payerId: playerId })}>
          Pagar aluguel
        </PrimaryButton>
        <PrimaryButton onClick={() => onAction({ kind: "buy", playerId })}>
          Comprar
        </PrimaryButton>
        <SecondaryButton onClick={() => onAction({ kind: "transfer", fromId: playerId })}>
          Transferir
        </SecondaryButton>
        <SecondaryButton
          onClick={() =>
            startTransition(async () => {
              await A.paySalary(playerId);
              router.refresh();
              onClose();
            })
          }
          disabled={pending}
        >
          Passou pela saída
        </SecondaryButton>
        <SecondaryButton onClick={() => onAction({ kind: "bank-receive", playerId })}>
          Receber do banco
        </SecondaryButton>
        <SecondaryButton onClick={() => onAction({ kind: "bank-pay", playerId })}>
          Pagar ao banco
        </SecondaryButton>
      </div>

      {owned.length > 0 && (
        <div className="pt-3">
          <h3 className="text-xs font-bold uppercase text-ink/60 mb-2">
            Propriedades ({owned.length})
          </h3>
          <div className="space-y-2">
            {owned.map((o) => {
              const pr = propsById.get(o.propertyId)!;
              return (
                <button
                  key={o.propertyId}
                  onClick={() => onAction({ kind: "manage", playerId, propertyId: o.propertyId })}
                  className="w-full text-left rounded-lg px-3 py-2 flex items-center justify-between"
                  style={{ backgroundColor: `${pr.color}22` }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: pr.color }}
                    />
                    <span className="font-medium">{pr.name}</span>
                    {o.hasHotel && <span>🏨</span>}
                    {!o.hasHotel && o.houses > 0 && <span>{"🏠".repeat(o.houses)}</span>}
                    {o.isMortgaged && (
                      <span className="text-xs text-crimson font-semibold">
                        (hipotecada)
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-ink/60">›</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() =>
          startTransition(async () => {
            await A.setBankrupt(playerId, !me.isBankrupt);
            router.refresh();
            onClose();
          })
        }
        className="w-full text-sm text-crimson py-2 mt-2"
      >
        {me.isBankrupt ? "Reativar jogador" : "Marcar como falido"}
      </button>
    </div>
  );
}

function BuyPropertySheet({
  playerId,
  players,
  properties,
  ownership,
  onDone,
}: {
  playerId: string;
  players: PlayerRow[];
  properties: Property[];
  ownership: GameProperty[];
  onDone: () => void;
}) {
  const me = players.find((x) => x.playerId === playerId)!;
  const ownedSet = new Set(
    ownership.filter((o) => o.ownerPlayerId !== null).map((o) => o.propertyId),
  );
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");

  const available = properties.filter(
    (p) =>
      !ownedSet.has(p.id) &&
      p.purchasePrice &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-bold text-lg">Comprar propriedade</h2>
        <div className="text-sm text-ink/60">
          {me.name} · saldo {formatMoney(me.balance)}
        </div>
      </div>
      <input
        placeholder="Buscar..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-ink/15"
      />
      <div className="space-y-2">
        {available.map((p) => (
          <button
            key={p.id}
            disabled={pending || me.balance < (p.purchasePrice || 0)}
            onClick={() =>
              startTransition(async () => {
                await A.buyProperty({ playerId, propertyId: p.id });
                onDone();
              })
            }
            className="w-full flex items-center justify-between rounded-lg p-3 disabled:opacity-50"
            style={{ backgroundColor: `${p.color}22` }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="font-medium text-left">{p.name}</span>
            </div>
            <span className="font-bold">{formatMoney(p.purchasePrice!)}</span>
          </button>
        ))}
        {available.length === 0 && (
          <div className="text-sm text-ink/60 italic text-center py-6">
            Sem propriedades disponíveis.
          </div>
        )}
      </div>
    </div>
  );
}

function PayRentSheet({
  payerId,
  players,
  properties,
  ownership,
  onDone,
}: {
  payerId: string;
  players: PlayerRow[];
  properties: Property[];
  ownership: GameProperty[];
  onDone: () => void;
}) {
  const payer = players.find((x) => x.playerId === payerId)!;
  const propsById = new Map(properties.map((p) => [p.id, p]));
  const playerById = new Map(players.map((p) => [p.playerId, p]));

  const rentable = ownership.filter(
    (o) => o.ownerPlayerId && o.ownerPlayerId !== payerId && !o.isMortgaged,
  );

  const [diceSum, setDiceSum] = useState<number>(7);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = selectedId ? propsById.get(selectedId)! : null;
  const needsDice = selected?.isStock;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-bold text-lg">Pagar aluguel</h2>
        <div className="text-sm text-ink/60">
          {payer.name} · saldo {formatMoney(payer.balance)}
        </div>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {rentable.map((o) => {
          const pr = propsById.get(o.propertyId)!;
          const owner = playerById.get(o.ownerPlayerId!)!;
          const isSel = selectedId === o.propertyId;
          const rent = computeRent(pr, o, diceSum);
          return (
            <button
              key={o.propertyId}
              onClick={() => setSelectedId(o.propertyId)}
              className={`w-full flex items-center justify-between rounded-lg p-3 ${isSel ? "ring-2 ring-ink" : ""}`}
              style={{ backgroundColor: `${pr.color}22` }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: pr.color }}
                />
                <div className="text-left min-w-0">
                  <div className="font-medium truncate">{pr.name}</div>
                  <div className="text-xs text-ink/60">
                    Dono: {owner.name}
                    {pr.isStock
                      ? " · ações"
                      : o.hasHotel
                        ? " · hotel"
                        : o.houses > 0
                          ? ` · ${o.houses} casa(s)`
                          : ""}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <div className="font-bold text-ink">
                  {pr.isStock
                    ? `${(pr.stockMultiplier || 0).toLocaleString("pt-BR")} × dados`
                    : formatMoney(rent)}
                </div>
                {pr.isStock && (
                  <div className="text-[10px] text-ink/60">
                    = {formatMoney(rent)}
                  </div>
                )}
              </div>
            </button>
          );
        })}
        {rentable.length === 0 && (
          <div className="text-sm text-ink/60 italic text-center py-6">
            Nenhuma propriedade para pagar aluguel.
          </div>
        )}
      </div>

      {selected && (
        <div className="space-y-3 pt-2">
          {needsDice && (
            <div className="bg-mint border-2 border-ink rounded-xl p-3">
              <label className="block text-sm font-semibold text-ink mb-2">
                Soma dos dados (aluguel = soma × ${(selected.stockMultiplier || 0).toLocaleString("pt-BR")})
              </label>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 11 }, (_, i) => i + 2).map((n) => (
                  <button
                    key={n}
                    onClick={() => setDiceSum(n)}
                    className={`w-10 h-10 rounded-lg font-bold ${diceSum === n ? "bg-ink text-white" : "bg-white border border-ink/15"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="text-sm mt-2 text-ink">
                Total: <strong>{formatMoney(diceSum * (selected.stockMultiplier || 0))}</strong>
              </div>
            </div>
          )}
          <PrimaryButton
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await A.payRent({
                  payerId,
                  propertyId: selected.id,
                  diceSum: needsDice ? diceSum : undefined,
                });
                onDone();
              })
            }
          >
            Confirmar pagamento
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}

function TransferSheet({
  fromId,
  players,
  onDone,
}: {
  fromId: string;
  players: PlayerRow[];
  onDone: () => void;
}) {
  const from = players.find((x) => x.playerId === fromId)!;
  const others = players.filter((x) => x.playerId !== fromId);
  const [toId, setToId] = useState<string | null>(others[0]?.playerId ?? null);
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-lg">Transferir</h2>
      <div className="text-sm text-ink/60">
        De {from.name} · saldo {formatMoney(from.balance)}
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase text-ink/60">Para</label>
        <div className="grid grid-cols-2 gap-2">
          {others.map((p) => (
            <button
              key={p.playerId}
              onClick={() => setToId(p.playerId)}
              className={`px-3 py-2 rounded-lg border-2 text-left ${toId === p.playerId ? "border-ink bg-mint/30" : "border-ink/15"}`}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-ink/60">{formatMoney(p.balance)}</div>
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-xs uppercase text-ink/60">Valor</span>
        <input
          type="number"
          inputMode="numeric"
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1 w-full px-4 py-3 rounded-xl border border-ink/15 text-lg font-bold"
          placeholder="0"
        />
      </label>

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Motivo (opcional)"
        className="w-full px-4 py-3 rounded-xl border border-ink/15"
      />

      <PrimaryButton
        disabled={pending || !toId || amount <= 0}
        onClick={() =>
          startTransition(async () => {
            await A.transferBetweenPlayers({
              fromPlayerId: fromId,
              toPlayerId: toId!,
              amount,
              description,
            });
            onDone();
          })
        }
      >
        Transferir {amount > 0 ? formatMoney(amount) : ""}
      </PrimaryButton>
    </div>
  );
}

function BankSheet({
  mode,
  playerId,
  passSalary,
  onDone,
}: {
  mode: "pay" | "receive";
  playerId: string;
  passSalary?: number;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  const presets =
    mode === "pay"
      ? [
          { v: 1000, label: "Imposto $ 1.000" },
          { v: 2000, label: "Multa $ 2.000" },
          { v: 5000, label: "Imposto $ 5.000" },
        ]
      : [
          { v: passSalary || 2000, label: `Salário $ ${(passSalary || 2000).toLocaleString("pt-BR")}` },
          { v: 1000, label: "Prêmio $ 1.000" },
          { v: 5000, label: "Prêmio $ 5.000" },
        ];

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-lg">
        {mode === "pay" ? "Pagar ao banco" : "Receber do banco"}
      </h2>

      <div className="grid grid-cols-1 gap-2">
        {presets.map((p) => (
          <button
            key={p.v}
            onClick={() => {
              setAmount(p.v);
              setDescription(p.label.replace(/\s*\$.*/, ""));
            }}
            className={`px-3 py-2 rounded-lg border-2 text-left ${amount === p.v ? "border-ink bg-mint/30" : "border-ink/15"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-xs uppercase text-ink/60">Valor</span>
        <input
          type="number"
          inputMode="numeric"
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1 w-full px-4 py-3 rounded-xl border border-ink/15 text-lg font-bold"
          placeholder="0"
        />
      </label>

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Motivo (opcional)"
        className="w-full px-4 py-3 rounded-xl border border-ink/15"
      />

      <PrimaryButton
        disabled={pending || amount <= 0}
        onClick={() =>
          startTransition(async () => {
            if (mode === "pay") {
              await A.payToBank({ playerId, amount, description });
            } else {
              await A.receiveFromBank({ playerId, amount, description });
            }
            onDone();
          })
        }
      >
        Confirmar
      </PrimaryButton>
    </div>
  );
}

function ManagePropertySheet({
  playerId,
  property,
  ownership,
  players,
  onDone,
}: {
  playerId: string;
  propertyId: number;
  property: Property;
  ownership: GameProperty;
  players: PlayerRow[];
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [transferTo, setTransferTo] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState(0);

  const canBuildHouse =
    !property.isStock &&
    !ownership.isMortgaged &&
    !ownership.hasHotel &&
    ownership.houses < 4;
  const canBuildHotel =
    !property.isStock &&
    !ownership.isMortgaged &&
    !ownership.hasHotel &&
    ownership.houses === 4;
  const unmortgageCost = Math.round(property.mortgageValue * 1.1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-lg"
          style={{ backgroundColor: property.color }}
        />
        <div>
          <h2 className="font-bold text-lg">{property.name}</h2>
          <div className="text-xs text-ink/60">
            {property.groupName}
            {ownership.hasHotel && " · 🏨 Hotel"}
            {!ownership.hasHotel && ownership.houses > 0 && ` · ${ownership.houses} casa(s)`}
            {ownership.isMortgaged && " · 💤 Hipotecada"}
          </div>
        </div>
      </div>

      {!property.isStock && (
        <div className="bg-cream-soft rounded-xl p-3 text-sm space-y-0.5">
          <div className="flex justify-between"><span>Aluguel</span><span>{formatMoney(property.baseRent || 0)}</span></div>
          <div className="flex justify-between"><span>1 casa</span><span>{formatMoney(property.rent1House || 0)}</span></div>
          <div className="flex justify-between"><span>2 casas</span><span>{formatMoney(property.rent2Houses || 0)}</span></div>
          <div className="flex justify-between"><span>3 casas</span><span>{formatMoney(property.rent3Houses || 0)}</span></div>
          <div className="flex justify-between"><span>4 casas</span><span>{formatMoney(property.rent4Houses || 0)}</span></div>
          <div className="flex justify-between"><span>Hotel</span><span>{formatMoney(property.rentHotel || 0)}</span></div>
          <div className="flex justify-between border-t pt-1 mt-1"><span>Comprar casa/hotel</span><span>{formatMoney(property.houseCost || 0)}</span></div>
        </div>
      )}
      {property.isStock && (
        <div className="bg-cream-soft rounded-xl p-3 text-sm">
          <div className="flex justify-between">
            <span>Lucros (soma dos dados ×)</span>
            <span>{formatMoney(property.stockMultiplier || 0)}</span>
          </div>
        </div>
      )}
      <div className="text-sm flex justify-between">
        <span>Valor da hipoteca</span>
        <span className="font-semibold">{formatMoney(property.mortgageValue)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2">
        {canBuildHouse && (
          <PrimaryButton
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await A.buildHouse({ playerId, propertyId: property.id });
                onDone();
              })
            }
          >
            🏠 Casa ({formatMoney(property.houseCost || 0)})
          </PrimaryButton>
        )}
        {canBuildHotel && (
          <PrimaryButton
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await A.buildHotel({ playerId, propertyId: property.id });
                onDone();
              })
            }
          >
            🏨 Hotel ({formatMoney(property.hotelCost || 0)})
          </PrimaryButton>
        )}
        {!ownership.isMortgaged ? (
          <SecondaryButton
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await A.mortgageProperty({ playerId, propertyId: property.id });
                onDone();
              })
            }
          >
            💤 Hipotecar (+{formatMoney(property.mortgageValue)})
          </SecondaryButton>
        ) : (
          <SecondaryButton
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await A.unmortgageProperty({ playerId, propertyId: property.id });
                onDone();
              })
            }
          >
            ✓ Resgatar (-{formatMoney(unmortgageCost)})
          </SecondaryButton>
        )}
        <SecondaryButton
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await A.sellPropertyToBank({ playerId, propertyId: property.id });
              onDone();
            })
          }
        >
          Vender ao banco
        </SecondaryButton>
      </div>

      <div className="border-t pt-3 mt-2 space-y-2">
        <div className="text-xs uppercase text-ink/60 font-semibold">
          Transferir para outro jogador
        </div>
        <div className="grid grid-cols-2 gap-2">
          {players
            .filter((p) => p.playerId !== playerId)
            .map((p) => (
              <button
                key={p.playerId}
                onClick={() => setTransferTo(p.playerId)}
                className={`px-3 py-2 rounded-lg border-2 text-left ${transferTo === p.playerId ? "border-ink bg-mint/30" : "border-ink/15"}`}
              >
                <div className="font-medium text-sm">{p.name}</div>
              </button>
            ))}
        </div>
        <input
          type="number"
          inputMode="numeric"
          value={transferAmount || ""}
          onChange={(e) => setTransferAmount(Number(e.target.value))}
          placeholder="Valor pago (0 = grátis)"
          className="w-full px-4 py-2 rounded-xl border border-ink/15"
        />
        <SecondaryButton
          disabled={pending || !transferTo}
          onClick={() =>
            startTransition(async () => {
              await A.transferProperty({
                fromPlayerId: playerId,
                toPlayerId: transferTo!,
                propertyId: property.id,
                amount: transferAmount,
              });
              onDone();
            })
          }
        >
          Confirmar transferência
        </SecondaryButton>
      </div>
    </div>
  );
}

function LogSheet({
  transactions,
  players,
  properties,
}: {
  transactions: Transaction[];
  players: PlayerRow[];
  properties: Property[];
}) {
  const pById = new Map(players.map((p) => [p.playerId, p.name]));
  const prById = new Map(properties.map((p) => [p.id, p.name]));
  return (
    <div className="space-y-2">
      <h2 className="font-bold text-lg">Histórico</h2>
      {transactions.length === 0 && (
        <div className="text-sm text-ink/60 italic text-center py-6">
          Nenhuma transação ainda.
        </div>
      )}
      <ul className="space-y-2">
        {transactions.map((t) => (
          <li key={t.id} className="bg-cream-soft rounded-lg px-3 py-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{t.description}</span>
              <span className="font-bold">{formatMoney(t.amount)}</span>
            </div>
            <div className="text-xs text-ink/60">
              {t.fromPlayerId ? pById.get(t.fromPlayerId) || "?" : "Banco"} →{" "}
              {t.toPlayerId ? pById.get(t.toPlayerId) || "?" : "Banco"}
              {" · "}
              {new Date(t.createdAt).toLocaleTimeString("pt-BR")}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EndGameSheet({
  players,
  onCancel,
  onDone,
}: {
  players: PlayerRow[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={async (formData) => {
        startTransition(async () => {
          await A.endGame(formData);
          onDone();
        });
      }}
      className="space-y-3"
    >
      <h2 className="font-bold text-lg">Encerrar partida</h2>
      <p className="text-sm text-ink/60">
        Selecione o vencedor (opcional) para registrar a vitória.
      </p>
      <div className="space-y-2">
        {players.map((p) => (
          <label
            key={p.playerId}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${winnerId === p.playerId ? "border-ink bg-mint bg-mint/30" : "border-ink/15"}`}
          >
            <input
              type="radio"
              name="winnerId"
              value={p.playerId}
              checked={winnerId === p.playerId}
              onChange={() => setWinnerId(p.playerId)}
              className="w-5 h-5"
            />
            <span className="font-medium">{p.name}</span>
            <span className="ml-auto text-sm text-ink/60">
              {formatMoney(p.balance)}
            </span>
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <SecondaryButton type="button" onClick={onCancel}>
          Cancelar
        </SecondaryButton>
        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-xl bg-crimson text-white font-bold active:scale-[0.98] disabled:opacity-50"
        >
          Encerrar
        </button>
      </div>
    </form>
  );
}
