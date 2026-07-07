# project-structure.md

Stack target: React + Vite + TypeScript + Tailwind + shadcn/ui + TanStack Start Node server + CranL PostgreSQL via server-only `DATABASE_URL`.

Migration status: public shop/fabric reads use server functions and `DATABASE_URL`; remaining auth/write/search flows still contain legacy Supabase code and must be migrated before those flows are production-ready.

## Route Map

| Route              | Page                               | Role          | Flow         |
| ------------------ | ---------------------------------- | ------------- | ------------ |
| `/`                | Landing → redirect by role         | public        | —            |
| `/login`           | CustomerLogin (OTP)                | public        | —            |
| `/shop/register`   | ShopRegister                       | public        | —            |
| `/shop/login`      | StaffLogin (email/password)        | public        | —            |
| `/explore`         | Explore (browse + semantic search) | customer      | Exploration  |
| `/fabrics/:id`     | FabricDetailPage                   | customer      | Exploration  |
| `/me/measurements` | MeasurementHistory                 | customer      | Exploration  |
| `/me/fabrics`      | SavedFabrics                       | customer      | Exploration  |
| `/shop`            | ShopDashboard                      | staff         | Confirmation |
| `/shop/fabrics`    | FabricInventory (CRUD)             | staff         | Confirmation |
| `/shop/customers`  | CustomerLookup + MeasurementEntry  | staff         | Confirmation |
| `/shop/inbox`      | ContactInbox                       | staff         | Confirmation |
| `/shop/staff`      | StaffManagement                    | staff (owner) | Confirmation |

Customer routes and shop routes use **separate layouts** (`CustomerLayout`, `ShopLayout`) with separate navigation. Route guards enforce role: a staff session cannot open `/me/*`, a customer session cannot open `/shop/*` (except the public register/login pages).

## Directory Layout

```
src/
├── main.tsx
├── App.tsx                        # router root, RTL + locale provider at the top
├── index.css                      # Tailwind base + design tokens from style-guide.md
│
├── lib/
│   ├── supabaseClient.ts          # single client instance
│   ├── types.ts                   # TS types mirroring database.md tables 1:1
│   ├── auth.ts                    # OTP helpers, session helpers, role detection
│   └── constants.ts               # measurement field list, similarity threshold, dedup window
│
├── hooks/
│   ├── useSession.ts              # current user + role (customer | staff) + shop_id if staff
│   ├── useMeasurements.ts         # customer history / staff per-shop entries
│   ├── useFabrics.ts              # browse/filter + shop CRUD
│   ├── useFabricSearch.ts         # calls semantic-search edge fn, hydrates results
│   ├── useContactRequests.ts      # insert w/ dedup check + shop inbox
│   └── useRatings.ts              # upsert + aggregate read
│
├── components/
│   ├── ui/                        # shadcn/ui primitives — do not hand-roll equivalents
│   ├── layout/
│   │   ├── CustomerLayout.tsx
│   │   ├── ShopLayout.tsx
│   │   └── RTLProvider.tsx        # dir="rtl", Arabic locale, direction-aware icon context
│   ├── fabric/
│   │   ├── FabricCard.tsx
│   │   ├── FabricForm.tsx         # staff intake form (SKU, description, price, tags, image)
│   │   ├── FabricRating.tsx       # stars + optional text, upsert
│   │   └── ContactShopButton.tsx  # dedup-aware, confirmation toast
│   ├── measurements/
│   │   ├── MeasurementHistoryTable.tsx   # dense, sticky header, tabular figures
│   │   └── MeasurementEntryForm.tsx      # staff-only, exact 8-field set + notes
│   └── search/
│       └── SemanticSearchBar.tsx
│
├── pages/                          # one file per route in the Route Map above
│   ├── auth/    → CustomerLogin, ShopRegister, StaffLogin
│   ├── customer/ → Explore, FabricDetailPage, MeasurementHistory, SavedFabrics
│   └── shop/     → Dashboard, FabricInventory, CustomerLookup, ContactInbox, StaffManagement
│
└── router.tsx                     # routes + role guards

supabase/
├── migrations/
│   └── 0001_init.sql              # ALL of database.md in one migration: tables, constraints, indexes, RLS
└── functions/
    ├── send-otp/
    ├── verify-otp/
    ├── embed-fabric/
    └── semantic-search/
```

## Rules

- `lib/types.ts` mirrors `database.md` exactly — if the two drift, the migration wins and types get fixed.
- `lib/constants.ts` is the single home for: the measurement field list, the semantic similarity threshold, and the 24h contact-request dedup window. No magic numbers scattered in components.
- Exactly four edge function directories. A fifth directory appearing under `supabase/functions/` means scope drift.
- No `pages/admin/` — there is no admin role in v1.
