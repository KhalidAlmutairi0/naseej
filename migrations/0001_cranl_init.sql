create extension if not exists pgcrypto;
create extension if not exists vector;

create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  created_at timestamptz not null default now()
);

create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  contact_phone text,
  created_at timestamptz not null default now()
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

create table otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);

create table fabrics (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  sku text not null,
  description text,
  price numeric(10,2),
  season_tags text[] default '{}',
  embedding vector(1536),
  image_url text,
  created_at timestamptz not null default now(),
  unique (shop_id, sku)
);

create table measurements (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  recorded_by uuid not null references staff(id),
  chest numeric(5,1),
  waist numeric(5,1),
  hip numeric(5,1),
  shoulder numeric(5,1),
  sleeve_length numeric(5,1),
  inseam numeric(5,1),
  neck numeric(5,1),
  thobe_length numeric(5,1),
  notes text,
  created_at timestamptz not null default now()
);

create table contact_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  fabric_id uuid not null references fabrics(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  fabric_id uuid not null references fabrics(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  review_text text,
  created_at timestamptz not null default now(),
  unique (customer_id, fabric_id)
);

create index fabrics_embedding_idx on fabrics using hnsw (embedding vector_cosine_ops);
create index measurements_customer_idx on measurements (customer_id, created_at desc);
create index measurements_shop_idx on measurements (shop_id, created_at desc);
create index contact_requests_inbox_idx on contact_requests (shop_id, created_at desc);
create index fabrics_shop_idx on fabrics (shop_id);
create index otp_codes_phone_idx on otp_codes (phone, created_at desc);
