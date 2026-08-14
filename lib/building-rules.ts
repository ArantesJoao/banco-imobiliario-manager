import type { Property, GameProperty } from "@/db/schema";

/**
 * Building rules for color groups — shared by the server actions and the game UI
 * so a button is never offered for something the server will reject.
 *
 * Buildings live on a single 0..5 scale: 0-4 are houses, 5 is a hotel. Raw
 * `houses` cannot be used for ordering because a hotel is stored as
 * `{ hasHotel: true, houses: 0 }`.
 */

export const HOTEL_LEVEL = 5;

export type Buildable = Pick<GameProperty, "houses" | "hasHotel">;

export type RuleCheck = { ok: true } | { ok: false; reason: string };

export type GroupState = {
  /** Building level of the card being inspected. */
  level: number;
  /** True when every card of this color belongs to the player. */
  ownsFullSet: boolean;
  /** Lowest level across the cards of this color the player owns. */
  minLevel: number;
  /** Highest level across the cards of this color the player owns. */
  maxLevel: number;
  /** True when any card of this color — whoever owns it — still has buildings. */
  groupHasBuildings: boolean;
};

export function buildingLevel(o: Buildable): number {
  return o.hasHotel ? HOTEL_LEVEL : o.houses;
}

/** Every property card sharing a color. Stock cards have no color group. */
export function groupCards(
  properties: Property[],
  groupName: string,
): Property[] {
  return properties.filter((p) => !p.isStock && p.groupName === groupName);
}

export function inspectGroup(args: {
  playerId: string;
  propertyId: number;
  properties: Property[];
  ownership: GameProperty[];
}): GroupState {
  const { playerId, propertyId, properties, ownership } = args;
  const ownByProp = new Map(ownership.map((o) => [o.propertyId, o]));
  const target = properties.find((p) => p.id === propertyId);
  const targetOwnership = ownByProp.get(propertyId);

  const level = targetOwnership ? buildingLevel(targetOwnership) : 0;
  if (!target || target.isStock) {
    return {
      level,
      ownsFullSet: false,
      minLevel: level,
      maxLevel: level,
      groupHasBuildings: level > 0,
    };
  }

  const siblings = groupCards(properties, target.groupName);
  let ownsFullSet = true;
  let minLevel = Infinity;
  let maxLevel = 0;
  let groupHasBuildings = false;

  for (const card of siblings) {
    const own = ownByProp.get(card.id);
    const cardLevel = own ? buildingLevel(own) : 0;
    if (cardLevel > 0) groupHasBuildings = true;
    if (own?.ownerPlayerId === playerId) {
      // Levels are compared only across the player's own cards, so a partial
      // set built up before these rules existed can still be sold back down.
      minLevel = Math.min(minLevel, cardLevel);
      maxLevel = Math.max(maxLevel, cardLevel);
    } else {
      ownsFullSet = false;
    }
  }

  return {
    level,
    ownsFullSet,
    minLevel: minLevel === Infinity ? level : minLevel,
    maxLevel,
    groupHasBuildings,
  };
}

export function canBuild(
  property: Property,
  ownership: GameProperty,
  group: GroupState,
): RuleCheck {
  if (property.isStock || !property.houseCost) {
    return { ok: false, reason: "Esta carta não aceita construções." };
  }
  if (ownership.isMortgaged) {
    return { ok: false, reason: "Resgate a hipoteca antes de construir." };
  }
  if (!group.ownsFullSet) {
    return { ok: false, reason: "Você precisa ter todas as cartas da cor." };
  }
  if (group.level >= HOTEL_LEVEL) {
    return { ok: false, reason: "Já tem hotel." };
  }
  if (group.level !== group.minLevel) {
    return {
      ok: false,
      reason: "Construa por igual: comece pelas cartas com menos casas.",
    };
  }
  return { ok: true };
}

export function canSellBuilding(
  property: Property,
  ownership: GameProperty,
  group: GroupState,
): RuleCheck {
  if (property.isStock || !property.houseCost) {
    return { ok: false, reason: "Esta carta não tem construções." };
  }
  if (group.level <= 0) {
    return { ok: false, reason: "Não há construções para vender." };
  }
  if (group.level !== group.maxLevel) {
    return {
      ok: false,
      reason: "Venda por igual: comece pelas cartas com mais casas.",
    };
  }
  return { ok: true };
}

/** Buildings are always sold back to the bank for half their purchase price. */
export function sellRefund(property: Property, level: number): number {
  const cost =
    level === HOTEL_LEVEL ? property.hotelCost || 0 : property.houseCost || 0;
  return Math.round(cost / 2);
}
