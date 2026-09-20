-- 0031_orders_vat_amount.sql
-- total_amount har hidtil kun været den ex-moms-rabatterede varesum — det
-- var korrekt "ved et uheld" for alle ordrer indtil nu, fordi alle kunder
-- har leveret til Grønland (0% moms, ×1,00 gør ingen forskel), men er
-- forkert for danske ordrer (25%). total_amount ændrer betydning her til
-- det FAKTISK opkrævede/betalte beløb (inkl. moms) — ikke omdøbt, kun
-- beregningen der ligger bag den ændres i app-koden (checkout-actions.ts).
--
-- subtotal_amount (ex moms) og vat_amount (selve momsbeløbet) tilføjes som
-- separate, gennemsigtige felter ved siden af — samme snapshot-princip som
-- vat_rate/vat_type/vat_destination/vat_note (0029): frosset ved
-- ordreoprettelse, en senere ændring i vat_rules ændrer aldrig en
-- eksisterende ordre. Nullable, da eksisterende ordrer fra før denne
-- migration ikke har et snapshot.
alter table public.orders
  add column subtotal_amount numeric(12, 2),
  add column vat_amount numeric(12, 2);
