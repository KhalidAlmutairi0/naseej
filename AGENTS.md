# AGENTS.md — Operating Instructions for the Coding Agent

You are building the app specified in `plan.md`, `architecture.md`, `database.md`, `api-contracts.md`, `project-structure.md`, and `style-guide.md`. These six files are the complete source of truth. **If something is not in them, it does not exist.** Do not infer, extrapolate, or "helpfully" add features, tables, fields, endpoints, or screens.

## Precedence when files conflict

1. `plan.md` — product intent and scope
2. `database.md` — data shape and isolation rules
3. `api-contracts.md` — endpoint shapes
4. `architecture.md` — system design
5. `project-structure.md` — file layout
6. `style-guide.md` — visuals

If you detect a conflict, stop and report it. Do not silently pick one interpretation.

## Hard Rules (violating any of these = failed build)

1. **NO payments, reservations, cart, or checkout.** The only purchase-adjacent element in the entire app is a "Contact Shop" button. If you are writing a booking calendar, a payment form, or an order table — stop, you have drifted.
2. **One customer identity, shared across shops.** Never create per-shop customer tables or duplicate customer rows. Isolation is enforced by RLS over shared identity.
3. **Isolation at the database layer, not the UI.** RLS policies from `database.md` go into the initial migration. "The UI doesn't show it" is not isolation — Shop B must get zero rows querying Shop A's measurements directly through the API.
4. **Exact measurement fields**: `chest, waist, hip, shoulder, sleeve_length, inseam, neck, thobe_length` + `notes`. No additions, removals, or renames.
5. **Exactly four edge functions**: `send-otp`, `verify-otp`, `embed-fabric`, `semantic-search`. Do not create a fifth. Everything else is direct Supabase SDK table access gated by RLS.
6. **Embeddings API key lives only in edge functions.** Never in client code, never in a public env var.
7. **No shop approval flow.** Registration → live, one step.
8. **Ratings**: 1–5 stars + optional text, upserted on `(customer_id, fabric_id)`. Nothing else.
9. **Contact requests**: dedupe the `(customer_id, fabric_id, shop_id)` triple within 24h at the application layer before insert. No hard unique constraint (repeat interest over time is legitimate).
10. **Arabic RTL-first.** `dir="rtl"` at the root, Arabic-first font, direction-aware icons. Verify every screen in RTL as you build it, not at the end.
11. **Two flows, not one.** Exploration (customer) and Confirmation (staff) are separate route trees with separate layouts. Never build a mode toggle.
12. **Fabrics without descriptions**: excluded from semantic search results, still present in browse/filter views. This is expected behavior, not an error state.

## Build Order

Follow this sequence — each step depends on the previous:

1. Supabase migration: all tables, constraints, indexes, and RLS policies from `database.md` in one migration. RLS is part of step 1, not a later hardening pass.
2. Auth: `send-otp` + `verify-otp` edge functions, customer session handling, shop/staff email-password auth.
3. Shop registration flow (shop + first staff in one transaction).
4. Fabric CRUD (staff side) + `embed-fabric` function wired to save.
5. Measurement entry (staff side, customer lookup/create included).
6. Customer views: measurement history, browse/filter fabrics, fabric detail + rating.
7. `semantic-search` function + search UI.
8. Contact Shop + shop inbox.
9. Staff management, saved fabrics view.
10. RTL/style pass against `style-guide.md` (should be a verification pass, not a retrofit — you built RTL-first).

## Verification Protocol (run before declaring anything done)

- **Isolation test**: create Shop A and Shop B, one shared customer, a measurement from each. Confirm: customer sees both; Shop A sees only its own; Shop B querying Shop A's row via the API gets zero rows (not a hidden UI element — zero rows). Shop B attempting to update Shop A's fabric gets a permission error.
- **SKU test**: same SKU in two different shops succeeds; duplicate SKU within one shop fails.
- **Rating test**: second rating from the same customer on the same fabric updates the first, doesn't create a second row.
- **Dedup test**: two Contact Shop taps within 24h create one row.
- **Empty-description test**: a fabric with no description appears in browse, never in semantic results, and `embed-fabric` no-ops without erroring.
- **RTL test**: forms, tables, and navigation render correctly with `dir="rtl"` and Arabic content.

## When Uncertain

Under-build, don't over-build. A missing feature is a one-line request away; an invented feature poisons the data model. If a screen needs data no documented endpoint or table provides, stop and flag it — the docs get updated first, then the code.

## Definition of Done (per feature)

A feature is done only if ALL are true:

- [ ] It maps to an F-number in `plan.md` section 7
- [ ] It touches only tables/fields in `database.md`
- [ ] It uses only the four edge functions in `api-contracts.md` (or direct SDK access)
- [ ] It passes the relevant checks in the Verification Protocol
- [ ] It renders correctly in Arabic/RTL
- [ ] It uses only tokens from `style-guide.md`
