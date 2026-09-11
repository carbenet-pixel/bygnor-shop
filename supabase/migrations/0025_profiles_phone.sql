-- 0025_profiles_phone.sql
-- Kontoens eget kontakttelefonnummer — adskilt fra delivery_addresses.phone
-- (kontaktperson-telefon pr. leveringsadresse, migration 0002). Kunden må
-- selv redigere dette felt (se app/shop/konto/indstillinger), i modsætning
-- til firma/CVR/rabat/betalingsmetode som forbliver admin-only.

alter table public.profiles add column phone text;
