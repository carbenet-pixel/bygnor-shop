-- 0019_orders_fulfillment_status_afsendt.sql
-- Kundevendt ordrehistorik (Fase 5) skal kunne vise "Afsendt" som et
-- selvstændigt trin mellem "Bestilt hos leverandør" og "Leveret" — det
-- fandtes ikke i 0014's ekspeditions-liste, som kun havde
-- ny/bestilt_hos_leverandør/leveret/annulleret.

alter table public.orders drop constraint orders_fulfillment_status_check;

alter table public.orders
  add constraint orders_fulfillment_status_check
  check (fulfillment_status in ('ny', 'bestilt_hos_leverandør', 'afsendt', 'leveret', 'annulleret'));
