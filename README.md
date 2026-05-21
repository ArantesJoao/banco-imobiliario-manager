# Super Banco Imobiliário

Digital bank (PWA) for the Brazilian board game **Super Banco Imobiliário** by Estrela.
The host signs in with Google, adds players, and runs the bank: balances,
transfers, property ownership, houses, hotels, mortgages, and a full
transaction log. UI is in Brazilian Portuguese (the game is a pt-BR product).

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind v4
- **Auth.js v5** (Google provider)
- **Drizzle ORM** + **Neon Postgres**
- **PWA** via `app/manifest.ts` + `public/sw.js`

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy and fill in `.env`:

   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `DATABASE_URL` — Neon connection string (https://neon.tech, free tier)
   - `AUTH_SECRET` — generate with `npx auth secret`
   - `AUTH_URL=http://localhost:5001`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — OAuth credentials from
     https://console.cloud.google.com/apis/credentials
     - Authorized redirect URI: `http://localhost:5001/api/auth/callback/google`
     - (Add the production URL too once you deploy.)

3. Create tables and seed property data:

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. Start the dev server (port **5001** — macOS reserves port 5000 for the
   AirPlay Receiver):

   ```bash
   npm run dev
   ```

   Open http://localhost:5001

## Deploying to Vercel

1. `vercel link` (or push the repo to GitHub and import it from the Vercel UI)
2. Add all env vars in the Vercel project settings
3. Update `AUTH_URL` to the production URL
4. Add the production redirect URI in the Google Cloud Console
5. After the first deploy, run `npm run db:push` and `npm run db:seed` against
   the production `DATABASE_URL`

## Features

- Google sign-in (only the host needs to log in)
- Per-host roster of saved players, with games-played and wins counters
- One active game at a time (end or cancel before starting another)
- History of finished games on the dashboard
- During a game:
  - Each player's balance shown large
  - **Pay rent** — auto-computes from houses/hotel state; for stock cards
    it prompts for the dice sum (rent = sum × multiplier)
  - **Buy property** from the bank
  - **Transfer** money between players or to/from the bank
  - **Salary** when passing GO (one-tap button)
  - **Build house/hotel**, **mortgage/unmortgage** (10% premium on redemption)
  - **Transfer property** between players, with optional price
  - Mark a player as **bankrupt** (returns all their properties to the bank)
  - Full **transaction log**
  - End the game and record the winner (bumps their win counter)

## Layout

```
app/
  page.tsx          # dashboard: roster, new game, finished-game history
  jogo/             # active game UI
  login/            # Google sign-in screen
  actions.ts        # server actions (transactions, properties, players)
  manifest.ts       # PWA manifest
  api/auth/[...nextauth]/route.ts
db/
  schema.ts         # Drizzle schema
  seed-data.ts      # Estrela Super Banco Imobiliário card data
  index.ts          # Neon client
scripts/seed.ts     # populates the `properties` table
auth.ts             # NextAuth + Drizzle adapter config
```
