# api-contracts.md

Current target: TanStack Start server functions/API routes using CranL PostgreSQL through server-only `DATABASE_URL`. Public shop/fabric reads have been migrated to this path.

The Supabase Edge Function contracts below are legacy reference during migration and must not be used as the CranL deployment contract.

Almost all data access is the Supabase client SDK hitting tables directly, gated by the RLS in `database.md` — those operations need no custom contract. This file defines the **only four Edge Functions** in the system. A fifth function appearing anywhere is scope drift.

## Conventions (all four functions)

- Auth: Supabase anon key + user JWT via the standard `supabase.functions.invoke()` — except `send-otp`/`verify-otp`, which are pre-auth.
- Error envelope (uniform):

```json
{ "error": { "code": "string_code", "message": "human readable" } }
```

- Success responses never mix with the error envelope: a response has either a body or an `error`, not both.

---

## 1) `send-otp` — issue a login code

`POST /functions/v1/send-otp` (pre-auth)

Request:

```json
{ "phone": "+9665XXXXXXXX" }
```

Success `200`:

```json
{ "success": true, "dev_code": "123456", "expires_in": 300 }
```

Behavior:

- Validates Saudi phone format (`+9665` + 8 digits). Invalid → `400 invalid_phone`.
- Rate limit: max 3 codes per phone per 10 minutes → `429 too_many_requests`.
- **v1 delivery is dev-mode**: the code is returned in the response and logged. No SMS provider is wired. The swap point for real SMS is inside this function only — nothing else changes.
- Code lifetime: 5 minutes, single use.

---

## 2) `verify-otp` — exchange code for session

`POST /functions/v1/verify-otp` (pre-auth)

Request:

```json
{ "phone": "+9665XXXXXXXX", "code": "123456", "full_name": "..." }
```

Success `200`:

```json
{
  "session": { "access_token": "...", "refresh_token": "..." },
  "customer_id": "uuid",
  "is_new": true
}
```

Behavior:

- Wrong/expired/used code → `401 invalid_code`.
- **Implicit registration**: if no customer exists for this phone, the function creates `auth.users` + `customers` row (service role — there is deliberately no client insert policy on `customers`). `full_name` is required only when `is_new` would be true; missing on a new account → `400 name_required`.
- Existing customer: `full_name` ignored, `is_new: false`.

---

## 3) `embed-fabric` — generate/store description embedding

`POST /functions/v1/embed-fabric` (auth: staff)

Request:

```json
{ "fabric_id": "uuid" }
```

Success `200`:

```json
{ "success": true }
```

No-op `200` (expected, not an error):

```json
{ "success": false, "reason": "no_description" }
```

Behavior:

- Verifies the fabric belongs to the caller's shop (via `staff` lookup) → otherwise `403 not_your_shop`.
- Reads `fabrics.description`; empty/null → clean no-op above.
- Calls the embeddings provider (server-side key — this function and `semantic-search` are the ONLY places that key exists), writes `fabrics.embedding`.
- Client calls this after every fabric create AND after any update that changed `description`. Fire-and-forget from the UI (don't block the save on it), but surface a retry if it fails.
- Provider failure → `502 embedding_failed` (fabric save is still valid; embedding can be retried).

---

## 4) `semantic-search` — natural-language fabric search

`POST /functions/v1/semantic-search` (auth: customer or staff)

Request:

```json
{ "query": "قماش صيفي خفيف يشبه اللي أخذته الشتاء الماضي", "limit": 20 }
```

Success `200`:

```json
{
  "results": [{ "fabric_id": "uuid", "shop_id": "uuid", "similarity": 0.83 }]
}
```

Behavior:

- Empty/whitespace query → `400 empty_query`. `limit` capped at 50.
- Embeds the query, runs the cosine similarity query from `database.md` with the minimum threshold from `lib/constants.ts` (start at 0.3, tune with real data). Below-threshold results are dropped — an empty `results` array is a valid answer; never pad with irrelevant fabrics.
- Returns IDs + scores only. The client hydrates full fabric rows through the normal SDK read (public RLS) — do not duplicate fabric payloads in this response.
- Fabrics with `embedding IS NULL` never appear here (they remain visible in browse/filter).

---

## Direct SDK operations (no edge function — listed so none get invented)

| Action                       | Table op                                                  | Contract lives in                         |
| ---------------------------- | --------------------------------------------------------- | ----------------------------------------- |
| Customer measurement history | `measurements` select                                     | RLS: own rows, all shops                  |
| Staff measurement entry      | `measurements` insert                                     | RLS: own shop + own staff id              |
| Staff fabric CRUD            | `fabrics` insert/update/delete                            | RLS: own shop; then invoke `embed-fabric` |
| Browse/filter fabrics        | `fabrics` select + filters (shop, season_tags, price)     | public read                               |
| Contact Shop                 | `contact_requests` insert after app-layer 24h dedup check | RLS: own customer_id                      |
| Shop inbox                   | `contact_requests` select                                 | RLS: own shop                             |
| Rate fabric                  | `ratings` upsert on `(customer_id, fabric_id)`            | RLS: own customer_id                      |
| Shop registration            | `shops` + owner `staff` insert (one transactional flow)   | no approval gate                          |
| Staff management             | `staff` insert/delete                                     | RLS: owner of same shop                   |

## Rules for the Agent

1. Four edge functions. Not five. If a screen seems to need a new endpoint, the docs change first — flag it, don't build it.
2. Embeddings key never leaves the edge functions. Not in client env, not in a public var, nowhere else.
3. Request/response shapes above are exact. Divergence = update this file first, then code.
4. Empty semantic results are correct behavior, not a bug to "fix" with padding.
