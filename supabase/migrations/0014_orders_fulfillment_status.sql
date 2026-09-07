-- 0014_orders_fulfillment_status.sql
-- Indfører et selvstændigt ekspeditionsfelt, uafhængigt af betalingsmetode
-- og betalingsstatus. 0013 tilføjede 'behandlet'/'afsendt' til orders.status
-- som en stedfortræder for ekspedition — det var en sammenblanding, som
-- denne migration retter: ekspedition får sit eget felt, og status går
-- tilbage til udelukkende at beskrive betaling.

alter table public.orders add column fulfillment_status text not null default 'ny';

-- Backfill fra den tidligere (forkerte) brug af status til ekspeditionsformål,
-- så den ene eksisterende ordre med status='behandlet' ikke mister information.
update public.orders set fulfillment_status = 'bestilt_hos_leverandør' where status = 'behandlet';
update public.orders set fulfillment_status = 'leveret' where status = 'afsendt';
update public.orders set fulfillment_status = 'annulleret' where status = 'annulleret';

alter table public.orders
  add constraint orders_fulfillment_status_check
  check (fulfillment_status in ('ny', 'bestilt_hos_leverandør', 'leveret', 'annulleret'));

create index idx_orders_fulfillment_status on public.orders(fulfillment_status);

-- 'behandlet'/'afsendt' beskrev aldrig faktisk betaling — de reverteres nu
-- til den nærmeste ægte betalingsstatus, før constraintet strammes igen.
update public.orders set status = 'afventer' where status in ('behandlet', 'afsendt');

alter table public.orders drop constraint orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('afventer', 'afventer_betaling', 'betalt', 'betaling_fejlet', 'annulleret'));
