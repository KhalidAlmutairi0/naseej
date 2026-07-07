# architecture.md

## System Overview

A single-database multi-tenant marketplace. Tenants are tailor shops; customer identity is deliberately **shared across tenants** — that shared identity is the product. The frontend is a React SPA talking directly to Supabase (Postgres + RLS) for almost everything; four Edge Functions exist only where a server-side secret or logic RLS can't express is required.

```
┌──────────────────────────────┐
│      React SPA (Lovable)     │
│  Exploration ── Confirmation │
│   (customer)      (staff)    │
└──────┬───────────────┬──────┘
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

## Decision Log (why, not just what)

| Decision              | Choice                                                   | Rationale                                                                                                                                                            |
| --------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenancy model         | Single DB, RLS-based isolation, shared customer identity | Per-shop DBs/schemas would destroy the core value (portable history). RLS gives structural isolation without duplicating identity.                                   |
| Fabric identification | Manual SKU entry by staff                                | No barcode infrastructure exists in these shops; OCR/scanning is scope creep. SKU + description is enough for v1.                                                    |
| Data entry            | Staff-mediated                                           | Matches the existing in-person process; customers won't self-measure. Lowers customer friction to zero.                                                              |
| Search                | pgvector on Supabase, external embeddings API            | Real semantic search inside a 2-week window with no separate vector DB to operate. Cosine similarity over description embeddings.                                    |
| Purchase path         | "Contact Shop" only                                      | No payments/reservations = no money-handling liability, no licensing questions, and the contact_request log doubles as the intent signal for future recommendations. |
| Shop onboarding       | Self-register, instant live                              | An approval gate needs an admin role + review UI — pure build cost with no v1 value.                                                                                 |
| OTP delivery          | Dev-mode (code displayed/logged)                         | Real SMS is a provider integration with a documented swap point; not needed to validate the product.                                                                 |
| Modes                 | Two separate flows                                       | Exploration (customer) and Confirmation (staff) have different users, devices, and contexts; a toggle would compromise both.                                         |

## The Isolation Model (most important section)

One `customers` table, one row per person. Shop-scoped tables (`measurements`, `fabrics`, `contact_requests`) carry `shop_id`. RLS resolves the requester's role and applies:

| Requester | measurements                                                 | fabrics                                            | contact_requests       |
| --------- | ------------------------------------------------------------ | -------------------------------------------------- | ---------------------- |
| Customer  | reads own rows across ALL shops (`customer_id = auth.uid()`) | reads all (public browse)                          | reads/creates own      |
| Staff     | reads/writes ONLY rows where `shop_id = their shop`          | full CRUD on own shop's rows; read others (public) | reads own shop's inbox |

Failure modes to guard against:

- **RLS too loose** → Shop B reads Shop A's measurements = privacy breach, product-killing.
- **RLS too tight** → customer can't see cross-shop history = the differentiator is gone.
- **App-layer-only filtering** → any direct API call bypasses it. RLS is non-negotiable and ships in migration 0001.

Staff identity resolution: RLS policies look up the requester's `shop_id` via the `staff` table (`staff.id = auth.uid()`). This lookup is the hinge of every shop-side policy — see `database.md` for the exact SQL.

## Authentication

- **Customers**: phone OTP. `send-otp` issues a short-lived code (dev-mode delivery); `verify-otp` exchanges it for a session and auto-creates the customer row on first success (implicit self-registration).
- **Staff**: Supabase email/password auth. A `staff` row links `auth.users.id` → `shop_id`. Shop registration creates shop + owner-staff in one transaction.
- Role detection client-side: presence of a `staff` row = staff session; otherwise customer.

## Semantic Search Pipeline

1. **Write path**: staff saves a fabric → client invokes `embed-fabric(fabric_id)` → function reads `description`, calls the embeddings API, writes `fabrics.embedding`. Empty description → clean no-op.
2. **Read path**: customer query → `semantic-search(query, limit)` → function embeds the query, runs `ORDER BY embedding <=> query_embedding` where `embedding IS NOT NULL`, applies a minimum similarity threshold (from `lib/constants.ts`), returns ranked IDs + scores. Client hydrates full fabric rows via normal SDK reads.
3. **Arabic caveat**: descriptions will be Arabic. The embeddings model must be verified on Arabic text before the provider is locked (multilingual models: e.g. OpenAI text-embedding-3, Cohere embed-multilingual, Voyage multilingual). The `vector(N)` dimension in the migration must match the chosen model — confirm first, then migrate. Do not guess a dimension and change it later.

## Contact Request Flow

Tap → app-layer dedup check (same customer+fabric+shop within 24h?) → insert `contact_requests` row → toast. Shop reads its inbox via RLS-filtered select. Nothing else triggers — no order, no reservation, no notification service.

## Explicit Non-Goals of This Architecture

No payment processor, no booking system, no admin layer, no realtime/websockets, no queue/worker infrastructure, no separate vector database, no microservices. Everything runs on Supabase primitives + one SPA.
