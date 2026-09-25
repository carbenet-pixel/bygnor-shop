-- 0038_user_deletion_fk_cleanup.sql
-- Reproduktion (forrige runde): en testbruger med en vare i kurven kunne
-- ikke slettes (admin.deleteUser -> generisk 500). Direkte forsøg på at
-- slette profiles-rækken via service-role/PostgREST afslørede den fulde
-- Postgres-fejl: 23503, "update or delete on table \"profiles\" violates
-- foreign key constraint \"carts_customer_id_fkey\" on table \"carts\"".
--
-- Fuld gennemgang af ALLE foreign keys mod auth.users.id/profiles.id (se
-- commit-beskeden/samtalen for den fulde tabel) — kun tre manglede en
-- bevidst ON DELETE-adfærd og faldt derfor tilbage til Postgres' default
-- NO ACTION:
--
--   carts.customer_id         -> profiles.id : NO ACTION -> CASCADE
--   orders.customer_id        -> profiles.id : NO ACTION -> RESTRICT (eksplicit)
--   campaign_codes.created_by -> profiles.id : NO ACTION -> SET NULL
--
-- Alle andre (delivery_addresses.profile_id, payment_method_requests.*,
-- cart_items.cart_id, order_items.order_id, quickpay_callback_events.order_id)
-- har allerede en bevidst adfærd fra deres oprindelige migration og røres
-- ikke her.
--
-- Bevidste valg pr. tabel:
--
-- carts: en kurv er flygtig, in-progress tilstand uden regnskabs- eller
-- sporbarhedsværdi -- slettes med brugeren. cart_items.cart_id cascader
-- allerede fra carts (0011), så denne ene rettelse er nok til at rydde
-- hele kæden.
--
-- orders: skal ALDRIG kunne slettes cascaderende, af regnskabs- og
-- sporbarhedshensyn -- en kunde med ordrehistorik deaktiveres
-- (profiles.is_active / ban_duration i lib/customers.ts), slettes ikke.
-- RESTRICT skrives eksplicit her, selvom den er funktionelt identisk med
-- den hidtidige implicitte NO ACTION -- udelukkende så en fremtidig læser
-- kan se at blokeringen er tilsigtet, ikke en forglemmelse som carts var.
--
-- campaign_codes.created_by: rent et "hvem oprettede denne"-felt, samme
-- mønster som payment_method_requests.reviewed_by (0002) -- en slettet
-- admin-/superadmin-konto skal ikke blokere sletning af koder de har
-- oprettet.

alter table public.carts
  drop constraint carts_customer_id_fkey,
  add constraint carts_customer_id_fkey
    foreign key (customer_id) references public.profiles(id) on delete cascade;

alter table public.orders
  drop constraint orders_customer_id_fkey,
  add constraint orders_customer_id_fkey
    foreign key (customer_id) references public.profiles(id) on delete restrict;

alter table public.campaign_codes
  drop constraint campaign_codes_created_by_fkey,
  add constraint campaign_codes_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null;
