# Tafseel Project

Arabic-first tailor shop marketplace MVP for preserving customer measurements, browsing fabrics, rating fabric choices, and sending a simple "Contact Shop" interest signal. The app is intentionally not an ecommerce, booking, cart, checkout, POS, or ERP system.

## Product Scope

Tafseel has two separate flows:

- **Exploration**: customer-facing fabric browse/search, fabric details, ratings, saved fabric memory, and measurement history.
- **Confirmation**: staff-facing shop workflows for fabric CRUD, customer lookup, measurement entry, contact inbox, and staff management.

The core product rule is shared customer identity across shops with database-level isolation. A customer can see their own measurement history across shops, while each shop can only access the rows it created.

## Source Of Truth

Implementation must follow these documents before code assumptions:

- `plan.md` - product intent, MVP scope, acceptance criteria, and non-goals
- `database.md` - schema, RLS policies, constraints, indexes, and isolation rules
- `api-contracts.md` - the only four Supabase Edge Functions
- `architecture.md` - system design and decision log
- `project-structure.md` - intended file layout and routing map
- `AGENTS.md` - operating rules for coding agents

`style-guide.md` is referenced by the agent instructions but is not present in this workspace. Add it before making visual claims or style-token-dependent changes.

## Tech Stack

- React 19
- TypeScript
- TanStack Router / TanStack Start
- Vite
- Tailwind CSS
- shadcn/ui primitives
- Supabase Auth, Postgres, RLS, pgvector, Storage, and Edge Functions

## Repository Layout

```text
.
├── src/
│   ├── components/        # UI primitives and feature components
│   ├── hooks/             # Supabase data access hooks
│   ├── lib/               # shared constants, auth helpers, types, clients
│   ├── routes/            # TanStack file-based routes
│   ├── router.tsx
│   ├── server.ts
│   ├── start.ts
│   └── styles.css
├── supabase/
│   ├── functions/         # send-otp, verify-otp, embed-fabric, semantic-search
│   └── migrations/        # 0001_init.sql includes schema + RLS
├── plan.md
├── database.md
├── api-contracts.md
├── architecture.md
├── project-structure.md
└── AGENTS.md
```

## Environment

Copy `.env.example` and fill the required values:

```bash
cp .env.example .env
```

Browser-safe values:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Server-only Supabase Edge Function secrets:

```bash
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
```

The embeddings key must stay inside `embed-fabric` and `semantic-search`. Do not expose it through Vite or client-side code.

## Development

Install dependencies:

```bash
bun install
```

Run the local app:

```bash
bun run dev
```

Build:

```bash
bun run build
```

Lint:

```bash
bun run lint
```

## CranL Deployment

This repository includes a `Dockerfile` for app-host deployment. The production image:

- installs dependencies with `npm ci`
- builds the TanStack/Nitro app with `npm run build`
- runs `.output/server/index.mjs` as a Node server
- binds to `0.0.0.0` and uses `PORT`, defaulting to `3000`

Set these environment variables in CranL:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not set `OPENAI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` on the browser app unless the same deployment also runs trusted server-only Supabase Edge Function code. Those secrets belong in Supabase Edge Function secrets.

## Supabase

The initial migration is `supabase/migrations/0001_init.sql`. It must include tables, constraints, indexes, and RLS policies together.

Exactly four Edge Function directories are expected:

- `send-otp`
- `verify-otp`
- `embed-fabric`
- `semantic-search`

Do not add purchase, reservation, cart, checkout, admin, or approval workflows.
