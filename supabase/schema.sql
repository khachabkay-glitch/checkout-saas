-- Merchants table
create table merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  custom_domain text unique,
  email text not null,

  -- Shopify config
  shopify_domain text not null,
  shopify_token text not null,

  -- Whop config
  whop_api_key text not null,
  whop_company_id text not null,
  whop_product_id text not null,

  -- Branding
  logo_url text,
  brand_color text default '#111827',
  accent_color text default '#059669',
  store_url text,
  store_name text,

  -- Subscription status
  active boolean default true,
  plan_status text default 'active',
  whop_subscription_id text,

  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Orders tracking (optional, for merchant dashboard)
create table orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  shopify_order_id text,
  shopify_order_number text,
  shopify_order_name text,
  email text,
  total numeric(10,2),
  currency text default 'EUR',
  status text default 'created',
  created_at timestamptz default now()
);

-- Auth: merchants sign in with email
create table merchant_users (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  email text unique not null,
  role text default 'owner',
  created_at timestamptz default now()
);

-- RLS policies
alter table merchants enable row level security;
alter table orders enable row level security;
alter table merchant_users enable row level security;

-- Indexes
create index idx_merchants_slug on merchants(slug);
create index idx_merchants_domain on merchants(custom_domain);
create index idx_orders_merchant on orders(merchant_id);
create index idx_merchant_users_email on merchant_users(email);
