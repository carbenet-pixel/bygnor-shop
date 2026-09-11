-- 0027_campaign_codes.sql
-- Fase 6: kampagnekoder. vendor_id nullable = gælder alle leverandører,
-- ellers kun linjer fra den ene leverandør (se lib/campaign-codes.ts).

create table public.campaign_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  vendor_id uuid references public.vendors(id),
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10, 2) not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Snapshot ved ordreoprettelse, samme princip som sku_snapshot/discount_label
-- (migration 0011/0015) — en senere redigering eller udløb af koden må ikke
-- ændre historiske ordrer.
alter table public.orders add column campaign_code_snapshot text;
alter table public.order_items add column campaign_discount_snapshot numeric;

alter table public.campaign_codes enable row level security;

grant select, insert, update, delete on public.campaign_codes to service_role;

-- Bevidst INGEN grant til authenticated. Kampagnekode-validering ved
-- checkout sker udelukkende server-side via service_role (se
-- lib/campaign-codes.ts) — aldrig via kundens egen session-klient, så en
-- kunde ikke kan forespørge tabellen direkte og "scanne" efter gyldige
-- koder. RLS-policyen nedenfor er kun et forsvar i dybden.
create policy "Admin og superadmin kan se kampagnekoder" on public.campaign_codes
  for select using (public.is_admin_or_superadmin());
