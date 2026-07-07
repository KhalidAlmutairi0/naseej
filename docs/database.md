# database.md

Postgres on Supabase. `pgvector` enabled. Everything below ships in **one migration** (`0001_init.sql`) — tables, constraints, indexes, and RLS together. RLS is never a follow-up task.

> **Embedding dimension**: `vector(1536)` below assumes OpenAI `text-embedding-3-small`. If a different model is chosen (see architecture.md, Arabic verification), change the dimension BEFORE running the migration. Never migrate first and guess later.

## Extensions

```sql
create extension if not exists vector;
```

## Helper: resolve requester's shop

Every shop-side policy hinges on this. Define once:

```sql
create or replace function auth_shop_id() returns uuid
language sql stable security definer as $$
  select shop_id from public.staff where id = auth.uid()
$$;
```

## Tables

### customers

```sql
create table public.customers (
  id uuid primary key references auth.users(id),
  full_name text not null,
  phone text not null unique,
  created_at timestamptz not null default now()
);
alter table public.customers enable row level security;

create policy customers_self_read on public.customers
  for select using (id = auth.uid() or auth_shop_id() is not null);
  -- staff can read customer names/phones for lookup; customers read only themselves
create policy customers_self_update on public.customers
  for update using (id = auth.uid());
-- inserts happen via verify-otp edge function (service role), no client insert policy
```

### shops

```sql
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  contact_phone text,
  created_at timestamptz not null default now()
);
alter table public.shops enable row level security;

create policy shops_public_read on public.shops for select using (true);
create policy shops_own_update on public.shops
  for update using (id = auth_shop_id());
-- insert via shop-registration flow (service role in one transaction with first staff row)
```

### staff

```sql
create table public.staff (
  id uuid primary key references auth.users(id),
  shop_id uuid not null references public.shops(id),
  full_name text not null,
  role text not null default 'staff' check (role in ('owner','staff')),
  created_at timestamptz not null default now()
);
alter table public.staff enable row level security;

create policy staff_same_shop_read on public.staff
  for select using (shop_id = auth_shop_id());
create policy staff_owner_write on public.staff
  for all using (
    shop_id = auth_shop_id()
    and exists (select 1 from public.staff s where s.id = auth.uid() and s.role = 'owner')
  );
```

### fabrics

```sql
create table public.fabrics (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id),
  sku text not null,
  description text,            -- free text: feel, drape, weight, uses, season. Powers search.
  price numeric(10,2),
  season_tags text[] default '{}',
  embedding vector(1536),      -- null until description embedded
  image_url text,
  created_at timestamptz not null default now(),
  unique (shop_id, sku)        -- SKU unique PER SHOP, not globally
);
alter table public.fabrics enable row level security;

create policy fabrics_public_read on public.fabrics for select using (true);
create policy fabrics_own_shop_write on public.fabrics
  for insert with check (shop_id = auth_shop_id());
create policy fabrics_own_shop_update on public.fabrics
  for update using (shop_id = auth_shop_id());
create policy fabrics_own_shop_delete on public.fabrics
  for delete using (shop_id = auth_shop_id());
```

### measurements — the load-bearing table

```sql
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  shop_id uuid not null references public.shops(id),
  recorded_by uuid not null references public.staff(id),
  chest numeric(5,1),
  waist numeric(5,1),
  hip numeric(5,1),
  shoulder numeric(5,1),
  sleeve_length numeric(5,1),
  inseam numeric(5,1),
  neck numeric(5,1),
  thobe_length numeric(5,1),   -- nullable; thobe-focused shops (core Saudi case)
  notes text,
  created_at timestamptz not null default now()
);
alter table public.measurements enable row level security;

-- THE core isolation policy:
-- customer reads ALL own rows across every shop; staff reads ONLY own shop's rows
create policy measurements_read on public.measurements
  for select using (
    customer_id = auth.uid()          -- customer: full cross-shop history
    or shop_id = auth_shop_id()       -- staff: own shop's entries only
  );
create policy measurements_staff_insert on public.measurements
  for insert with check (
    shop_id = auth_shop_id() and recorded_by = auth.uid()
  );
create policy measurements_staff_update on public.measurements
  for update using (shop_id = auth_shop_id());
create policy measurements_staff_delete on public.measurements
  for delete using (shop_id = auth_shop_id());
-- customers have NO write access to measurements (staff-mediated entry)
```

### contact_requests

```sql
create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  fabric_id uuid not null references public.fabrics(id),
  shop_id uuid not null references public.shops(id),  -- denormalized from fabric for RLS/inbox
  created_at timestamptz not null default now()
);
alter table public.contact_requests enable row level security;

create policy cr_customer_insert on public.contact_requests
  for insert with check (customer_id = auth.uid());
create policy cr_read on public.contact_requests
  for select using (
    customer_id = auth.uid()          -- customer sees own requests
    or shop_id = auth_shop_id()       -- shop sees its inbox
  );
-- NO unique constraint on (customer_id, fabric_id, shop_id):
-- repeat interest over time is legitimate. Dedup within 24h is APPLICATION-LAYER
-- (check before insert, window constant in lib/constants.ts).
```

### ratings

```sql
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  fabric_id uuid not null references public.fabrics(id),
  stars int not null check (stars between 1 and 5),
  review_text text,
  created_at timestamptz not null default now(),
  unique (customer_id, fabric_id)     -- one rating per customer per fabric; upsert to edit
);
alter table public.ratings enable row level security;

create policy ratings_public_read on public.ratings for select using (true);
create policy ratings_own_write on public.ratings
  for insert with check (customer_id = auth.uid());
create policy ratings_own_update on public.ratings
  for update using (customer_id = auth.uid());
```

## Indexes

```sql
-- vector similarity (prefer hnsw if the pgvector version supports it; else ivfflat)
create index fabrics_embedding_idx on public.fabrics
  using hnsw (embedding vector_cosine_ops);

create index measurements_customer_idx on public.measurements (customer_id, created_at desc);
create index measurements_shop_idx on public.measurements (shop_id, created_at desc);
create index contact_requests_inbox_idx on public.contact_requests (shop_id, created_at desc);
create index fabrics_shop_idx on public.fabrics (shop_id);
```

## Semantic search query (used inside the semantic-search edge function)

```sql
select id, shop_id, 1 - (embedding <=> $1) as similarity
from public.fabrics
where embedding is not null
  and 1 - (embedding <=> $1) >= $2   -- minimum threshold, e.g. 0.3 to start; tune later
order by embedding <=> $1
limit $3;
```

## Hard Rules for the Agent

1. No table, column, or constraint exists beyond this file. A "helpful" extra column is scope drift.
2. The measurement columns are exactly the 8 listed + notes. No renames.
3. Never create a per-shop customers table or copy customer rows per shop.
4. RLS ships in migration 0001. There is no "add RLS later" state, ever — not even locally.
5. Customer inserts to `customers` go through `verify-otp` (service role). Do not add a client-side insert policy on `customers`.
6. If the embeddings model changes, the `vector()` dimension changes in THIS file first, then the migration.
