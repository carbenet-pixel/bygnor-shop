-- 0015_order_discount_snapshot.sql
-- Rabatberegning ved checkout var slet ikke implementeret nogen steder —
-- alle kunder betalte reelt fuld pris uanset aftalt rabatgruppe. Dette
-- tilføjer felterne til at gemme et snapshot af den anvendte rabat, så
-- den fortsat er korrekt selv hvis kundens rabatgruppe ændres senere.

-- order_items.unit_price_snapshot gemmer fra nu af den RABATTEREDE pris
-- (det kunden reelt betaler pr. stk) — ingen omdøbning af den eksisterende
-- kolonne, kun en ny kolonne til den oprindelige pris ved siden af.
alter table public.order_items add column base_price_snapshot numeric(10, 2);

-- Rabatten er pr. kunde, ikke pr. produkt — samme sats for alle linjer på
-- én ordre, derfor gemt én gang på selve ordren.
alter table public.orders add column discount_percent numeric(5, 2) not null default 0;
alter table public.orders add column discount_label text;
