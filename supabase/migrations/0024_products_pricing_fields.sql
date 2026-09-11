-- 0024_products_pricing_fields.sql
-- catalog_page findes allerede (migration 0008) — kun de to manglende
-- felter tilføjes her.

alter table public.products add column cost_price_dkk numeric;
alter table public.products add column price_on_request boolean not null default false;
