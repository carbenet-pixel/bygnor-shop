-- Fase 4, del 1: Kurv-grundlag (+ ordre-skema til senere brug i checkout)
-- Kundedata ligger på public.profiles med role (superadmin/admin/kunde),
-- bekræftet mod 0001/0002 — ingen separat customers-tabel i dette projekt.

alter table public.profiles
  add column invoice_approved boolean not null default false;

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity int not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

-- Ordre-skema forberedt her, men bruges først i næste Fase 4-omgang
-- (checkout/betaling) — ikke en del af kurv-funktionaliteten i denne omgang.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  delivery_recipient_name text not null,
  delivery_address_line1 text not null,
  delivery_address_line2 text,
  delivery_postal_code text not null,
  delivery_city text not null,
  delivery_country text not null default 'Grønland',
  payment_method text not null check (payment_method in ('kort', 'faktura')),
  status text not null default 'afventer',
  total_amount numeric(12, 2),
  created_at timestamptz not null default now()
);
-- Leveringsfelter er et snapshot ved bestillingstidspunktet, ikke en
-- reference til kundens adressetabel — så en senere adresseændring på
-- kunden ikke ændrer historiske ordrer.

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  sku_snapshot text not null,
  name_snapshot text not null,
  unit_price_snapshot numeric(10, 2),
  quantity int not null check (quantity > 0)
);
-- sku/name/pris gemmes som snapshot, så en senere produktændring eller
-- prisændring ikke ændrer historiske ordrer.

create index idx_cart_items_cart on public.cart_items(cart_id);
create index idx_orders_customer on public.orders(customer_id);
create index idx_order_items_order on public.order_items(order_id);

alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- service_role skal have et eksplicit grant, uanset RLS — CREATE TABLE via
-- SQL Editor giver det ikke automatisk (jf. 0005/0006/0008).
grant all on public.carts, public.cart_items, public.orders, public.order_items
  to service_role;

-- Kurv: kunden læser/skriver direkte via egen session (RLS afgrænser til
-- egen kurv) — samme mønster som produktkataloget i lib/catalog.ts.
grant select, insert, update, delete on public.carts, public.cart_items
  to authenticated;
-- Ordrer: kun select+insert til authenticated. Statusændringer (betaling
-- godkendt, afsendt osv.) sker via service_role fra admin-siden, ikke fra
-- kundens egen session.
grant select, insert on public.orders, public.order_items to authenticated;

create policy "Kunde ser og redigerer egen kurv" on public.carts
  for all using (customer_id = auth.uid());

create policy "Kunde ser og redigerer egne kurv-varer" on public.cart_items
  for all using (
    cart_id in (select id from public.carts where customer_id = auth.uid())
  );

-- Genbruger public.is_admin_or_superadmin() fra 0002 (SECURITY DEFINER,
-- undgår RLS-rekursion) i stedet for at inline samme opslag igen.
create policy "Kunde ser egne ordrer, admin ser alle" on public.orders
  for select using (
    customer_id = auth.uid() or public.is_admin_or_superadmin()
  );

create policy "Kunde kan oprette egen ordre" on public.orders
  for insert with check (customer_id = auth.uid());

create policy "Kunde ser egne ordrelinjer, admin ser alle" on public.order_items
  for select using (
    order_id in (select id from public.orders where customer_id = auth.uid())
    or public.is_admin_or_superadmin()
  );

create policy "Kunde kan oprette egne ordrelinjer" on public.order_items
  for insert with check (
    order_id in (select id from public.orders where customer_id = auth.uid())
  );