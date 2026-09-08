-- 0023_external_customer_number.sql
-- Eksternt kundenummer (KNI/Aarhus-fragt) — valgfrit, ingen formatkrav
-- kendt endnu. Snapshot på orders efter samme fastfrysningsprincip som
-- leveringsadresse og priser (migration 0011/0015): en senere ændring af
-- kundens nummer må ikke ændre historiske ordrer.

alter table public.profiles add column external_customer_number text;
alter table public.orders add column external_customer_number_snapshot text;
