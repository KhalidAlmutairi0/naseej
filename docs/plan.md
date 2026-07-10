# plan.md - Tailor Shop Marketplace MVP

## 1. Problem

Tailor shop customers need a better way to manage their measurements and fabric history because the process is still largely paper-based, and fabric identifiers are not effectively used. As a result, customers struggle to:

1. **Recover their measurements** - the record lives on a paper card in one shop's drawer. Lose the card or switch shops, and the measurements are gone.
2. **Find fabrics they previously liked** - fabric rolls have no identifier a customer can reference. "The blue one from last Ramadan" is not queryable.
3. **Discover similar options** - with no structured fabric data, there is nothing to recommend against.

## 2. Core Insight & Positioning

The differentiator is **customer-owned, portable history that survives across shops**. No single tailor's ledger can offer that - the value comes precisely from being a neutral layer above any one shop.

**Hook**: "Never lose a measurement or a fabric you loved again, even if you switch tailors."

What this product is NOT:

- Not a POS or ERP for tailor shops
- Not an e-commerce checkout
- Not an inventory management system (fabric records exist to serve customer discovery, not stock control)

## 3. Users

| Role       | Who                                                                   | What they get                                                                        |
| ---------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Customer   | Person who gets clothes tailored (thobes, suits) at one or more shops | Permanent measurement history + fabric memory + natural-language fabric discovery    |
| Shop staff | Employee/owner of a tailor shop                                       | Digital customer records replacing paper cards, plus a lead inbox (contact requests) |

Data entry is **staff-mediated**: shop staff enters measurements and fabric records. Customers consume, search, rate, and contact. This matches the existing in-person, physical process - customers are not asked to self-measure.

## 4. How It Works (solution mapping)

| Problem            | Solution                     | Mechanism                                                                                                                                                                                |
| ------------------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lost measurements  | Portable measurement history | Every measurement entry is a structured row tied to the customer's account, tagged with shop + staff + timestamp. Customer reads across all shops; each shop reads only its own entries. |
| Unfindable fabrics | Structured fabric identity   | Staff enters SKU + a free-text description (feel, drape, weight, uses, season) per fabric. SKU is the shop's reference; description powers discovery.                                    |
| No discovery       | Semantic search              | Description text → embedding (pgvector). Customer queries in natural language ("navy wool but lighter"); cosine similarity ranks results across all shops.                               |
| No purchase path   | "Contact Shop"               | Single action, logged as a `contact_request`. Doubles as the shop's inbox and the only purchase-intent signal in v1. No payment, no reservation.                                         |

## 5. The Two Flows (do not merge)

- **Exploration** (customer-facing): browse/search fabrics across all shops, view detail, rate, save, contact.
- **Confirmation** (staff-facing, in-store): look up or create a customer, enter measurements, record which fabric was chosen.

These are two separate screen flows with separate layouts - not one screen with a mode toggle.

## 6. Data Isolation Rule (load-bearing - never violate)

- One customer = one account, shared across the whole marketplace.
- A customer sees **all** of their own history across every shop.
- A shop sees **only entries it created**. Shop B must be structurally unable (RLS, not UI hiding) to read or edit Shop A's measurement entries for a shared customer.
- This is a permission filter over shared identity, NOT per-shop customer records.

## 7. MVP Scope

### In scope - with acceptance criteria

| #   | Feature                               | Done when                                                                                                                                                                                  |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1  | Customer OTP auth (dev-mode delivery) | Customer enters phone → receives code (displayed in dev mode, no real SMS) → session created. First successful verify auto-creates the account.                                            |
| F2  | Shop self-registration                | One flow creates shop + first staff account. Live immediately, no approval gate.                                                                                                           |
| F3  | Fabric CRUD (staff)                   | Staff can create/edit/delete fabrics for their shop only. SKU unique per shop. Description saved triggers embedding generation.                                                            |
| F4  | Measurement entry (staff)             | Staff selects/creates a customer, enters the 8-field measurement set + optional notes. Row is stamped with shop_id + recorded_by.                                                          |
| F5  | Measurement history (customer)        | Customer sees all entries across all shops, newest first, with shop name and date. Read-only.                                                                                              |
| F6  | Semantic search (customer)            | Natural-language query returns similarity-ranked fabrics across all shops, above a minimum threshold. Fabrics without descriptions are excluded from semantic results but still browsable. |
| F7  | Browse/filter fabrics (customer)      | Non-semantic list with basic filters (shop, season tag, price range).                                                                                                                      |
| F8  | Fabric detail + rating                | 1-5 stars + optional text. One rating per customer per fabric (editable, not stackable). Average shown on card and detail.                                                                 |
| F9  | Contact Shop                          | Tap logs a contact_request (customer, fabric, shop, timestamp). Deduped within 24h for the same triple. Confirmation toast shown.                                                          |
| F10 | Shop contact inbox                    | Staff sees requests for their shop only, newest first, with customer name/phone and fabric.                                                                                                |
| F11 | Staff management                      | Shop owner can add/remove staff accounts for their shop.                                                                                                                                   |
| F12 | Saved/rated fabrics view (customer)   | Customer sees fabrics they've rated or contacted about, as their "fabric memory."                                                                                                          |

### Out of scope - do not build even partially

- Payments, checkout, cart, reservations, or booking of any kind
- Shop approval/verification workflow
- Photo reviews, review replies, upvotes
- Real SMS delivery (swap point documented, not implemented)
- Admin/superadmin dashboard
- Push notifications, real-time updates, websockets
- Order status / fulfillment tracking
- Fabric stock quantity tracking

## 8. Measurement Field Set (fixed for v1)

`chest, waist, hip, shoulder, sleeve_length, inseam, neck, thobe_length` - plus optional free-text `notes`. `thobe_length` is nullable (relevant for thobe-focused shops, the core Saudi market case). Do not add, remove, or rename fields.

## 9. Language & Market

- Primary UI language: **Arabic**, RTL-first. English is not required for v1.
- Target market: Saudi Arabia. Phone format +9665XXXXXXXX, prices in SAR.

## 10. Known Risks (acknowledged, not blockers)

- **Unvalidated demand**: no customer interviews done yet. Ship the MVP, validate with real shops before scaling.
- **Description quality**: semantic search is only as good as staff-written descriptions. The fabric intake form should nudge structure (feel / weight / uses / season) but v1 does not enforce it.
- **Arabic embedding quality**: descriptions will be in Arabic; the embeddings model must handle Arabic well. Verify before locking the provider (see architecture.md).
