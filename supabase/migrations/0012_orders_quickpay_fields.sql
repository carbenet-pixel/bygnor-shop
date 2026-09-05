-- 0012_orders_quickpay_fields.sql
-- Tilføjer felter nødvendige for Quickpay-integrationen

alter table public.orders add column order_reference text;
alter table public.orders add column quickpay_payment_id text;
alter table public.orders add column quickpay_link_url text;

-- order_reference skal matche Quickpays krav til order_id: ^[a-zA-Z0-9]{4,20}$
-- Generér den som fx de første 20 tegn af UUID'et uden bindestreger, og
-- gør den unik og NOT NULL i selve applikationskoden ved oprettelse
-- (kan ikke garanteres unik ved en simpel kolonne-default alene).
create unique index if not exists idx_orders_order_reference on public.orders(order_reference);