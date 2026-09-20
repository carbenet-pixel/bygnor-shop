-- 0032_close_order_forgery_trust_boundary.sql
-- Sikkerhedsaudit-fund #1/#9/#10/#12/#16/#17/#18: kunder havde direkte
-- INSERT-adgang til orders/order_items (RLS tjekkede kun ejerskab, ikke
-- status/pris/beløb — en kunde kunne i teorien indsætte status='betalt',
-- fabrikerede priser, eller payment_method='faktura' uden godkendelse,
-- direkte mod PostgREST udenom Next.js-appen). cost_price_dkk var desuden
-- læsbar af enhver autentificeret kunde via tabel-niveau SELECT.
--
-- Denne migration lukker adgangsvejen. Den betroede erstatning
-- (create_customer_order()) oprettes i 0033 — herefter er dette den
-- ENESTE vej til at oprette en ordre.

-- ---------------------------------------------------------------------
-- 1) orders/order_items: fjern kundens direkte INSERT helt. SELECT
-- (allerede ejerskabs-afgrænset af eksisterende policies fra 0011) er
-- uændret — kunden skal stadig kunne se egne ordrer.
-- ---------------------------------------------------------------------
revoke insert on public.orders, public.order_items from authenticated;

-- Policyerne "Kunde kan oprette egen ordre"/"Kunde kan oprette egne
-- ordrelinjer" (0011) bliver herved virkningsløse (intet insert-grant
-- tilbage til at evaluere dem imod) — efterlades bevidst i stedet for at
-- droppes, de er harmløse uden grant'et og dokumenterer historikken.

-- Dybde-forsvar: selv hvis et fremtidigt grant ved en fejl gengives til
-- authenticated, blokerer denne trigger stadig direkte kunde-skrivning.
-- current_user (ikke current_user inde i en SECURITY DEFINER-kontekst,
-- og IKKE session_user) afspejler den PostgREST-rolle forespørgslen reelt
-- kører som (authenticated/service_role) — create_customer_order() kører
-- med sin ejers rettigheder (0033), så current_user er der IKKE
-- 'authenticated', og triggeren blokerer derfor ikke dens egne inserts.
create function public.block_customer_order_items_write()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'authenticated' then
    raise exception
      'order_items kan ikke skrives direkte af kunder — kun via create_customer_order()';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger order_items_no_direct_customer_write
  before insert or update on public.order_items
  for each row execute function public.block_customer_order_items_write();

-- ---------------------------------------------------------------------
-- 2) cost_price_dkk flyttes til egen tabel, INGEN grant til authenticated
-- — samme mønster som campaign_codes (0027) og vat_rules (0029). Ingen
-- applikationskode læser/skriver cost_price_dkk i dag (grep bekræftet),
-- så flytningen er risikofri for eksisterende funktionalitet.
-- ---------------------------------------------------------------------
create table public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost_price_dkk numeric
);

insert into public.product_costs (product_id, cost_price_dkk)
select id, cost_price_dkk from public.products;

alter table public.products drop column cost_price_dkk;

alter table public.product_costs enable row level security;

grant all on public.product_costs to service_role;
-- Bevidst INGEN grant til authenticated — kun læsbar via service_role fra
-- betroet server-kode (admin-siderne, når/hvis de får brug for den).

-- ---------------------------------------------------------------------
-- 3) products: udelukk vat_rate fra kunde-SELECT (ubrugt i al reel
-- prisberegning — se lib/vat-rules.ts, som bruger den destinations-
-- baserede vat_rules-tabel i stedet — lav prioritet, men rettes her mens
-- grants alligevel ændres). Tabel-niveau REVOKE + eksplicit kolonneliste
-- i stedet for REVOKE SELECT (vat_rate): et tabel-niveau GRANT SELECT
-- dækker allerede alle kolonner uafhængigt af et senere kolonne-niveau
-- REVOKE på én enkelt kolonne (Postgres' privilegier er additive, ikke
-- subtraktive på tværs af de to niveauer) — kun en eksplicit allow-list
-- lukker vat_rate reelt ude.
-- ---------------------------------------------------------------------
revoke select on public.products from authenticated;

grant select (
  id, vendor_id, product_group_id, sku, name, name_da, description,
  catalog_page, base_price, stock_status, lead_time_days, image_url,
  image_subgroup_key, sort_order, active, price_on_request, created_at
) on public.products to authenticated;

-- ---------------------------------------------------------------------
-- 4) Ingen negative priser — ingen eksisterende rækker overtræder denne
-- (bekræftet ved opslag før migrationen skrives), så ingen backfill
-- nødvendig.
-- ---------------------------------------------------------------------
alter table public.products
  add constraint products_base_price_non_negative
  check (base_price is null or base_price >= 0);
