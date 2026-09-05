-- 0012_orders_quickpay_fields.sql
-- Tilføjer felter til Quickpay-integrationen (kort-betaling). Rører ikke
-- faktura-sporet.

alter table public.orders add column order_reference text;
alter table public.orders add column quickpay_payment_id text;
alter table public.orders add column quickpay_link_url text;

-- order_reference skal matche Quickpays krav til order_id: ^[a-zA-Z0-9]{4,20}$.
-- Nullable (faktura-sporet får måske aldrig brug for den — bruges kun af
-- kort-flowet), men formatet håndhæves når værdien er sat, og feltet er
-- altid unikt. Unikhed/udfyldelse ved oprettelse håndhæves i applikationskoden
-- (kan ikke garanteres af en kolonne-default alene).
alter table public.orders
  add constraint orders_order_reference_format
  check (order_reference is null or order_reference ~ '^[a-zA-Z0-9]{4,20}$');

create unique index idx_orders_order_reference on public.orders(order_reference);

-- status havde ingen begrænsning i 0011 (livscyklussen var ikke designet
-- endnu). Nu hvor kort-flowets tilstande er kendt, håndhæves de her.
-- 0 rækker i orders pt., så tilføjelsen er risikofri.
alter table public.orders
  add constraint orders_status_check
  check (status in ('afventer', 'afventer_betaling', 'betalt', 'betaling_fejlet', 'annulleret'));
