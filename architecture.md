# architecture.md

## System Overview

A single-database multi-tenant marketplace. Tenants are tailor shops; customer identity is deliberately **shared across tenants** — that shared identity is the product. The frontend calls the TanStack Start Node server, and the server talks to CranL PostgreSQL through `DATABASE_URL`. Server-side code owns all database access; `DATABASE_URL` is never exposed to the browser.

```
┌──────────────────────────────┐
│      React SPA               │
│  Exploration ── Confirmation │
│   (customer)      (staff)    │
└──────┬───────────────┬──────┘
       │ Server functions / API
       ▼
┌─────────────────────┐
│ TanStack Start Node │
│ DATABASE_URL        │
│ server-only secrets │
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ CranL PostgreSQL    │
│ + pgvector          │
└─────────────────────┘
```

## Decision Log (why, not just what)

| Decision              | Choice                                                         | Rationale                                                                                                                                                            |
| --------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenancy model         | Single DB, server-enforced isolation, shared customer identity | Per-shop DBs/schemas would destroy the core value (portable history). Server data access must enforce shop/customer scope on every request.                          |
| Fabric identification | Manual SKU entry by staff                                      | No barcode infrastructure exists in these shops; OCR/scanning is scope creep. SKU + description is enough for v1.                                                    |
| Data entry            | Staff-mediated                                                 | Matches the existing in-person process; customers won't self-measure. Lowers customer friction to zero.                                                              |
| Search                | pgvector on CranL PostgreSQL, external embeddings API          | Real semantic search inside a 2-week window with no separate vector DB to operate. Cosine similarity over description embeddings.                                    |
| Purchase path         | "Contact Shop" only                                            | No payments/reservations = no money-handling liability, no licensing questions, and the contact_request log doubles as the intent signal for future recommendations. |
| Shop onboarding       | Self-register, instant live                                    | An approval gate needs an admin role + review UI — pure build cost with no v1 value.                                                                                 |
| OTP delivery          | Dev-mode (code displayed/logged)                               | Real SMS is a provider integration with a documented swap point; not needed to validate the product.                                                                 |
| Modes                 | Two separate flows                                             | Exploration (customer) and Confirmation (staff) have different users, devices, and contexts; a toggle would compromise both.                                         |

## The Isolation Model (most important section)

One `customers` table, one row per person. Shop-scoped tables (`measurements`, `fabrics`, `contact_requests`) carry `shop_id`. In the CranL PostgreSQL architecture, isolation is enforced in the Node server data layer before SQL is executed:

| Requester | measurements                                                   | fabrics                                            | contact_requests       |
| --------- | -------------------------------------------------------------- | -------------------------------------------------- | ---------------------- |
| Customer  | reads own rows across ALL shops (`customer_id = session user`) | reads all (public browse)                          | reads/creates own      |
| Staff     | reads/writes ONLY rows where `shop_id = their shop`            | full CRUD on own shop's rows; read others (public) | reads own shop's inbox |

Failure modes to guard against:

- **RLS too loose** → Shop B reads Shop A's measurements = privacy breach, product-killing.
- **RLS too tight** → customer can't see cross-shop history = the differentiator is gone.
- **Direct browser database access** → forbidden. Only server code can use `DATABASE_URL`.

Staff identity resolution: server request/session logic looks up the requester's `shop_id` via the `staff` table. This lookup is the hinge of every shop-side query.

## Authentication

- **Customers**: phone OTP. Server code issues a short-lived code (dev-mode delivery), verifies it, creates a customer row on first success, and sets an app session.
- **Staff**: email/password auth owned by the Node server. A `staff` row links staff identity → `shop_id`. Shop registration creates shop + owner-staff in one transaction.
- Role detection is server-owned; the browser receives only session-safe role data.

## Semantic Search Pipeline

1. **Write path**: staff saves a fabric → server reads `description`, calls the embeddings API, writes `fabrics.embedding`. Empty description → clean no-op.
2. **Read path**: customer query → server embeds the query, runs `ORDER BY embedding <=> query_embedding` where `embedding IS NOT NULL`, applies a minimum similarity threshold (from `lib/constants.ts`), returns ranked fabric rows.
3. **Arabic caveat**: descriptions will be Arabic. The embeddings model must be verified on Arabic text before the provider is locked (multilingual models: e.g. OpenAI text-embedding-3, Cohere embed-multilingual, Voyage multilingual). The `vector(N)` dimension in the migration must match the chosen model — confirm first, then migrate. Do not guess a dimension and change it later.

## Contact Request Flow

Tap → app-layer dedup check (same customer+fabric+shop within 24h?) → insert `contact_requests` row → toast. Shop reads its inbox via RLS-filtered select. Nothing else triggers — no order, no reservation, no notification service.

## Explicit Non-Goals of This Architecture

No payment processor, no booking system, no admin layer, no realtime/websockets, no queue/worker infrastructure, no separate vector database, no microservices. Everything runs in one TanStack Start app plus CranL PostgreSQL.
