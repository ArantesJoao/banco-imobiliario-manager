# Super Banco Imobiliário

Banco digital (PWA) para o jogo **Super Banco Imobiliário** da Estrela.
Anfitrião faz login com Google, cadastra jogadores, e gerencia saldos,
transferências, propriedades, casas, hotéis, hipotecas e histórico de partidas.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind v4
- **Auth.js v5** (Google provider)
- **Drizzle ORM** + **Neon Postgres**
- **PWA** via `app/manifest.ts` + `public/sw.js`

## Setup local

1. Instalar dependências:

   ```bash
   npm install
   ```

2. Copiar e preencher o `.env`:

   ```bash
   cp .env.example .env
   ```

   Variáveis necessárias:
   - `DATABASE_URL` — string de conexão do Neon (https://neon.tech, free tier)
   - `AUTH_SECRET` — gere com `npx auth secret`
   - `AUTH_URL=http://localhost:5001`
   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — credenciais OAuth em
     https://console.cloud.google.com/apis/credentials
     - Authorized redirect URI: `http://localhost:5001/api/auth/callback/google`
     - (E também a URL de produção quando deploy.)

3. Criar tabelas e seed das propriedades:

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. Subir o dev server (porta **5001** — porta 5000 fica reservada pelo AirPlay Receiver no macOS):

   ```bash
   npm run dev
   ```

   Acesse http://localhost:5001

## Deploy (Vercel)

1. `vercel link` (ou suba o repo no GitHub e importe pela UI da Vercel)
2. Adicione todas as variáveis de ambiente no painel da Vercel
3. Atualize `AUTH_URL` para a URL de produção
4. Adicione a redirect URI de produção no console do Google
5. Após o primeiro deploy, rode `npm run db:push` e `npm run db:seed` apontando
   para o `DATABASE_URL` de produção

## Funcionalidades

- Login com Google (apenas o anfitrião precisa logar)
- Lista de jogadores salvos por anfitrião, com contagem de partidas e vitórias
- Uma partida ativa por vez (cancelar/encerrar para começar outra)
- Histórico de partidas finalizadas
- Em jogo:
  - Saldo de cada jogador em destaque
  - **Pagar aluguel** — para ações, pede a soma dos dados; senão usa a tabela
    de casas/hotéis automaticamente
  - **Comprar propriedade** do banco
  - **Transferir** dinheiro entre jogadores ou para/do banco
  - **Salário** ao passar pela saída (botão único)
  - **Construir casa/hotel**, **hipotecar/resgatar**
  - **Transferir** propriedade entre jogadores (com valor opcional)
  - Marcar jogador como **falido** (devolve propriedades ao banco)
  - **Histórico** completo de transações
  - Encerrar partida e registrar vencedor

## Estrutura

```
app/
  page.tsx          # dashboard: jogadores salvos, nova partida, histórico
  jogo/             # partida ativa
  login/            # tela de login com Google
  actions.ts        # server actions (transações, propriedades, jogadores)
  manifest.ts       # PWA manifest
  api/auth/[...nextauth]/route.ts
db/
  schema.ts         # Drizzle schema
  seed-data.ts      # cartas Super Banco Imobiliário Estrela
  index.ts          # Neon client
scripts/seed.ts     # popula tabela `properties`
auth.ts             # NextAuth + Drizzle adapter config
```
