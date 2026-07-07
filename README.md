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
- `api-contracts.md` - server-side API contract
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
- CranL PostgreSQL via `DATABASE_URL`
- pgvector for semantic fabric search

## Repository Layout

```text
.
├── src/
│   ├── components/        # UI primitives and feature components
│   ├── hooks/             # React Query hooks
│   ├── lib/               # shared constants, auth helpers, types, clients
│   ├── routes/            # TanStack file-based routes
│   ├── router.tsx
│   ├── server.ts
│   ├── start.ts
│   └── styles.css
├── migrations/            # CranL PostgreSQL migrations
├── supabase/              # legacy migration/function files retained during DATABASE_URL migration
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

Server-only values:

```bash
DATABASE_URL=
DATABASE_SSL=false
```

Optional server-only embeddings value:

```bash
OPENAI_API_KEY=
```

Never expose `DATABASE_URL` or `OPENAI_API_KEY` through `VITE_*`.

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
DATABASE_URL=
DATABASE_SSL=false
```

Run `migrations/0001_cranl_init.sql` against the CranL PostgreSQL database before using data-backed flows.

## Database

The CranL PostgreSQL migration is `migrations/0001_cranl_init.sql`.

Migration status: public shop/fabric reads use `DATABASE_URL` through TanStack Start server functions. Auth, staff writes, ratings, contact requests, measurements, and semantic search still need to be migrated from the legacy Supabase paths.

Do not add purchase, reservation, cart, checkout, admin, or approval workflows.
