-- 0001_init.sql — Tailor Shop Marketplace (Naseej)
-- Single migration: extensions, helper, tables, constraints, indexes, and RLS together.
-- RLS is never a follow-up. Embedding dimension = vector(1536) (OpenAI text-embedding-3-small).
--
-- auth_shop_id() references public.staff, which is created further down. Disable body
-- validation for this transaction so statement order can mirror database.md; every
-- referenced object exists by the time the function is actually called at runtime.
set check_function_bodies = off;

-- Extensions
create extension if not exists vector;

-- Helper: resolve requester's shop. Every shop-side policy hinges on this.
create or replace function auth_shop_id() returns uuid
language sql stable security definer as $$
  select shop_id from public.staff where id = auth.uid()
$$;

-- customers
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

-- shops
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

-- staff
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

-- fabrics
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

-- measurements — the load-bearing table
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

-- contact_requests
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

-- ratings
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

-- otp_codes — dev-mode OTP store for send-otp / verify-otp.
-- NOT in the original database.md: custom OTP (dev_code in response, no SMS provider —
-- see api-contracts.md) needs its own persistence, and all tables/RLS must ship in 0001.
-- Touched ONLY by the service role inside the two pre-auth edge functions; RLS on with
-- no policies means no anon/user client can read or write it.
create table public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.otp_codes enable row level security;
-- no policies by design: service role only.

-- register_shop — atomic shop + first-owner-staff creation (F2, api-contracts.md).
-- NOT in the original database.md, but required: RLS gives `shops` no insert policy and
-- `staff` an owner-only write policy, so a client SDK insert can never bootstrap the first
-- shop. A 5th edge function is disallowed, so this runs as a security-definer RPC invoked
-- via supabase.rpc() by the freshly signed-up staff user. It ties the shop to auth.uid()
-- and refuses to run if that user already belongs to a shop.
create or replace function register_shop(
  p_shop_name text,
  p_location text,
  p_contact_phone text,
  p_owner_name text
) returns uuid
language plpgsql security definer as $$
declare
  v_uid uuid := auth.uid();
  v_shop_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from public.staff where id = v_uid) then
    raise exception 'already_registered';
  end if;

  insert into public.shops (name, location, contact_phone)
  values (p_shop_name, p_location, p_contact_phone)
  returning id into v_shop_id;

  insert into public.staff (id, shop_id, full_name, role)
  values (v_uid, v_shop_id, p_owner_name, 'owner');

  return v_shop_id;
end;
$$;

-- match_fabrics — the semantic-search query from database.md, wrapped as an RPC so the
-- edge function can pass a vector param. Body is verbatim the documented cosine query.
create or replace function match_fabrics(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
) returns table (id uuid, shop_id uuid, similarity float)
language sql stable as $$
  select id, shop_id, 1 - (embedding <=> query_embedding) as similarity
  from public.fabrics
  where embedding is not null
    and 1 - (embedding <=> query_embedding) >= match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Indexes
-- vector similarity (prefer hnsw if the pgvector version supports it; else ivfflat)
create index fabrics_embedding_idx on public.fabrics
  using hnsw (embedding vector_cosine_ops);

create index measurements_customer_idx on public.measurements (customer_id, created_at desc);
create index measurements_shop_idx on public.measurements (shop_id, created_at desc);
create index contact_requests_inbox_idx on public.contact_requests (shop_id, created_at desc);
create index fabrics_shop_idx on public.fabrics (shop_id);
create index otp_codes_phone_idx on public.otp_codes (phone, created_at desc);

reset check_function_bodies;
