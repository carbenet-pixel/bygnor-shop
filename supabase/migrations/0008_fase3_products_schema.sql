-- Fase 3: Produkter — vendors, categories, product_groups, products
-- Baseret på Pido_katalog_2026.xlsx (457 produkter, 5 afdelinger, 79 produktgrupper)

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cvr text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table public.product_groups (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  name text not null
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id),
  product_group_id uuid not null references public.product_groups(id),
  sku text not null unique,
  name text not null,
  description text,
  catalog_page int,
  base_price numeric(10, 2),
  vat_rate numeric(4, 2) not null default 25.00,
  stock_status text not null default 'bestillingsvare',
  lead_time_days int,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_products_product_group on public.products(product_group_id);
create index idx_products_vendor on public.products(vendor_id);
create index idx_product_groups_category on public.product_groups(category_id);

-- RLS: læseadgang for autentificerede kunder, fuld adgang for service_role.
alter table public.vendors enable row level security;
alter table public.categories enable row level security;
alter table public.product_groups enable row level security;
alter table public.products enable row level security;

-- service_role skal have et eksplicit grant, uanset RLS — CREATE TABLE via
-- SQL Editor giver det ikke automatisk (jf. 0005/0006).
grant all on public.vendors, public.categories, public.product_groups, public.products
  to service_role;

-- Samme pointe gælder authenticated: uden dette grant bliver policyerne
-- nedenfor aldrig evalueret — PostgREST afviser før RLS kommer i spil.
grant select on public.vendors, public.categories, public.product_groups, public.products
  to authenticated;

create policy "Autentificerede kan læse vendors" on public.vendors
  for select using (auth.role() = 'authenticated');
create policy "Autentificerede kan læse categories" on public.categories
  for select using (auth.role() = 'authenticated');
create policy "Autentificerede kan læse product_groups" on public.product_groups
  for select using (auth.role() = 'authenticated');
create policy "Autentificerede kan læse aktive produkter" on public.products
  for select using (auth.role() = 'authenticated' and active = true);
