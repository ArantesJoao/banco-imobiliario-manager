import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
  serial,
  uuid,
} from "drizzle-orm/pg-core";

// ───────────────────────── Auth.js (Drizzle adapter) ─────────────────────────
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ───────────────────────── Banco Imobiliário ─────────────────────────

// Saved players that belong to a user account (host's "roster")
export const players = pgTable("players", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  totalWins: integer("total_wins").notNull().default(0),
  totalGames: integer("total_games").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Static property catalog (seeded once)
export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  cardNumber: integer("card_number").notNull().unique(), // 1..28 from the deck
  name: text("name").notNull(),
  color: text("color").notNull(), // hex e.g. "#22c55e"
  groupName: text("group_name").notNull(), // pt-BR group label e.g. "verde-claro"
  isStock: boolean("is_stock").notNull().default(false),
  // Property fields (null for stock cards)
  purchasePrice: integer("purchase_price"),
  baseRent: integer("base_rent"),
  rent1House: integer("rent_1_house"),
  rent2Houses: integer("rent_2_houses"),
  rent3Houses: integer("rent_3_houses"),
  rent4Houses: integer("rent_4_houses"),
  rentHotel: integer("rent_hotel"),
  houseCost: integer("house_cost"),
  hotelCost: integer("hotel_cost"),
  mortgageValue: integer("mortgage_value").notNull(),
  // Stock fields (null for property cards)
  stockMultiplier: integer("stock_multiplier"), // e.g. 500 → soma dos dados × 500
});

// One active game per user at a time
export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"), // active | finished
  startingBalance: integer("starting_balance").notNull().default(30000),
  passSalary: integer("pass_salary").notNull().default(2000),
  winnerPlayerId: uuid("winner_player_id").references(() => players.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export const gamePlayers = pgTable(
  "game_players",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    balance: integer("balance").notNull().default(30000),
    color: text("color").notNull().default("#3b82f6"), // token color
    isBankrupt: boolean("is_bankrupt").notNull().default(false),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.playerId] })],
);

export const gameProperties = pgTable(
  "game_properties",
  {
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    propertyId: integer("property_id")
      .notNull()
      .references(() => properties.id),
    ownerPlayerId: uuid("owner_player_id").references(() => players.id, {
      onDelete: "set null",
    }),
    houses: integer("houses").notNull().default(0), // 0..4
    hasHotel: boolean("has_hotel").notNull().default(false),
    isMortgaged: boolean("is_mortgaged").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.propertyId] })],
);

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  fromPlayerId: uuid("from_player_id").references(() => players.id),
  toPlayerId: uuid("to_player_id").references(() => players.id),
  amount: integer("amount").notNull(),
  // type: rent, purchase, sale, build, mortgage, unmortgage, salary, transfer, bank_in, bank_out
  type: text("type").notNull(),
  description: text("description").notNull(),
  propertyId: integer("property_id").references(() => properties.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Game = typeof games.$inferSelect;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type GameProperty = typeof gameProperties.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
