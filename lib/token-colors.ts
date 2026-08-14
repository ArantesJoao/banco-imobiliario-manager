// Token colors are handed out by seat order when a game starts, so the color a
// player carries doubles as their seat number — that's what keeps the on-screen
// order stable (game_players has no explicit seat column).
export const TOKEN_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export function seatIndex(color: string): number {
  const i = TOKEN_COLORS.indexOf(color);
  return i === -1 ? TOKEN_COLORS.length : i;
}
