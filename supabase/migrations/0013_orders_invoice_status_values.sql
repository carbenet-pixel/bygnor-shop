-- 0013_orders_invoice_status_values.sql
-- /admin/orders skal kunne sætte faktura-ordrer til 'behandlet'/'afsendt',
-- som ikke var en del af status-checket tilføjet i 0012 (kort-flowets
-- afventer_betaling/betalt/betaling_fejlet var det eneste kendte dengang).

alter table public.orders drop constraint orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in (
    'afventer',
    'afventer_betaling',
    'betalt',
    'betaling_fejlet',
    'annulleret',
    'behandlet',
    'afsendt'
  ));
