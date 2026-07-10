# نَسيج · Naseej

**A tailor-shop fabric marketplace with portable, customer-owned measurement history and AI semantic fabric search.**

Naseej solves a very specific, very real problem in the Saudi tailoring market: your measurements live on a paper card in one shop's drawer, and the fabric you loved last Ramadan has no name you can search for. Naseej makes measurements **portable across every shop** and fabrics **discoverable in natural language** - while guaranteeing, at the database layer, that no shop can read another shop's records for a shared customer.

> Arabic-first, RTL. Built for Saudi Arabia (phone `+9665…`, prices in SAR). Not an e-commerce, cart, checkout, booking, POS, or ERP system.

---

## Core idea

The product is a **neutral layer above any single shop** - and that neutrality is the value:

- **One customer identity, shared across the whole marketplace** - never per-shop copies.
- A **customer** reads their *full* measurement history across every shop they've visited.
- A **shop** can read and write only the entries *it* created - enforced by Postgres Row-Level Security, not UI hiding.
- The only purchase-adjacent action is **"Contact Shop."** No payments, cart, checkout, or booking of any kind.

---

## Features

| # | Feature | Summary |
|---|---------|---------|
| F1 | Customer OTP auth | Phone → code (dev-mode delivery) → session. First verify auto-creates the account. |
| F2 | Shop self-registration | One flow creates shop + owner-staff. Live instantly, no approval gate. |
| F3 | Fabric CRUD | Staff manage their shop's fabrics (SKU unique per shop). Saving a description generates its embedding. |
| F4 | Measurement entry | Staff record the 8-field measurement set + notes for an existing customer. |
| F5 | Measurement history | Customer sees every entry across all shops, newest first, read-only. |
| F6 | Semantic search | Natural-language fabric search ranked by cosine similarity over description embeddings. |
| F7 | Browse & filter | Non-semantic list with shop / season-tag / price filters. |
| F8 | Ratings | 1-5 stars + optional text, one editable rating per customer per fabric. |
| F9 | Contact Shop | Logs a `contact_request`, deduped 24h per (customer, fabric, shop). |
| F10 | Shop inbox | Staff see contact requests for their shop only. |
| F11 | Staff management | Owner views/removes staff. |
| F12 | Fabric memory | Customer's "saved" view = fabrics they've rated or contacted about. |

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + **TanStack Start / Router** (file-based routing, SSR) |
| Styling | Tailwind CSS v4 + shadcn/ui, RTL-first |
| Data | **Supabase** - Postgres + `pgvector`, Auth, Edge Functions |
| Server logic | Four Deno edge functions (only where a server-side secret or bootstrap logic is required) |
| Embeddings | OpenAI `text-embedding-3-small` (`vector(1536)`) |
| Data fetching | TanStack Query |

---

## Architecture

```
┌──────────────────────────────┐
│      React SPA (TanStack)     │
│  Exploration ── Confirmation  │
│   (customer)      (staff)     │
└──────┬───────────────┬────────┘
       │ Supabase SDK  │ invoke()
       │ (RLS-gated)   │
       ▼               ▼
┌──────────────┐  ┌─────────────────────┐
│  Postgres    │  │  Edge Functions     │
│  + pgvector  │◄─┤  send-otp           │
│  + RLS       │  │  verify-otp         │
│              │  │  embed-fabric ──────┼──► Embeddings API
│              │  │  semantic-search ───┼──► (server-side key)
└──────────────┘  └─────────────────────┘
```

Almost all data access is the Supabase client SDK hitting tables directly, gated by RLS. Edge functions exist only for the four cases that need a secret or bootstrap logic.

### The isolation model (the load-bearing part)

One `customers` row per person. Shop-scoped tables (`measurements`, `fabrics`, `contact_requests`) carry a `shop_id`. RLS resolves the requester's role via a `security definer` helper `auth_shop_id()` and applies:

| Requester | `measurements` | `fabrics` | `contact_requests` |
|-----------|---------------|-----------|--------------------|
| Customer | reads own rows across **all** shops | reads all (public browse) | reads/creates own |
| Staff | reads/writes **only** own shop's rows | full CRUD on own shop; reads others | reads own shop's inbox |

Tables, constraints, indexes, and RLS all ship in a single migration (`supabase/migrations/0001_init.sql`). There is no "add RLS later" state.

Measurement fields are exactly: `chest, waist, hip, shoulder, sleeve_length, inseam, neck, thobe_length` + optional `notes` (`thobe_length` nullable for thobe-focused shops).

---

## Edge functions (exactly four)

| Function | Auth | Purpose |
|----------|------|---------|
| `send-otp` | pre-auth | Issue a dev-mode login code (returned in response; swap point for real SMS is this file only). |
| `verify-otp` | pre-auth | Exchange code for a session; implicit customer registration on first success. |
| `embed-fabric` | staff | Generate/store a fabric description embedding. |
| `semantic-search` | customer/staff | Embed a query, return cosine-ranked fabric IDs + scores (client hydrates rows). |

The embeddings API key exists **only** inside `embed-fabric` and `semantic-search`.

Full spec: [`docs/`](docs/) - [product plan](docs/plan.md), [architecture](docs/architecture.md), [database](docs/database.md), [API contracts](docs/api-contracts.md).

---

## Project structure

```
src/
├── routes/          # file-based routes (customer + /shop/* staff area)
├── components/
│   ├── ui/          # shadcn primitives
│   ├── fabric/      # FabricForm, FabricRating, ContactShopButton
│   └── measurements/# entry form + history table
├── hooks/           # useSession, useFabrics, useMeasurements, useRatings, …
├── lib/             # supabaseClient, types (mirror the schema 1:1), auth, constants
└── routeTree.gen.ts # generated by the TanStack Router plugin

supabase/
├── migrations/0001_init.sql   # tables + constraints + indexes + RLS, all in one
└── functions/                 # the four edge functions

docs/                          # product & technical specification
```

---

## Getting started

**Prerequisites:** Node 20+, [Bun](https://bun.sh), a Supabase project, and (for search) an OpenAI API key.

```bash
# 1. Install
bun install

# 2. Configure - copy the example and fill in your project's values
cp .env.example .env

# 3. Database - apply the schema + RLS
supabase link --project-ref <your-ref>
supabase db push

# 4. Edge functions
supabase functions deploy send-otp verify-otp --no-verify-jwt
supabase functions deploy embed-fabric semantic-search
supabase secrets set OPENAI_API_KEY=sk-...   # enables semantic search

# 5. Run
bun dev
```

### Environment variables

| Variable | Where | Notes |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | client | Browser-safe |
| `VITE_SUPABASE_ANON_KEY` | client | anon / publishable key - browser-safe (RLS gates everything) |
| `SUPABASE_SERVICE_ROLE_KEY` | edge only | Auto-injected into deployed functions |
| `OPENAI_API_KEY` | edge only | Embeddings; confined to two functions |

OTP delivery is **dev-mode**: the code is returned in the `send-otp` response and logged. Wiring a real SMS provider is a change to that one function only.

---

## License

Private project. All rights reserved.
