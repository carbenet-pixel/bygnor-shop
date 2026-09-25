-- 0039_require_aal2_for_admin_reads.sql
-- Sikkerhedsaudit-fund #2: proxy.ts håndhæver AAL2 for HTTP-ruter
-- (/shop, /admin), men et direkte Supabase-API-kald uden om Next.js rammer
-- aldrig proxy.ts — kun RLS-politikkerne. En admin logget ind med kun
-- adgangskode (aal1, endnu ikke bekræftet 2FA) kunne derfor læse alle
-- kunders data direkte via API'et, uafhængigt af proxy.ts's beskyttelse.
--
-- Berørt (verificeret i produktion via pg_policies — alle syv bruger
-- public.is_admin_or_superadmin(), og den funktion bruges IKKE andre
-- steder, bekræftet ved gennemsøgning af hele migrationshistorikken):
--   profiles                 "Admin kan se alle profiler"              (0002)
--   delivery_addresses       "Admin kan se alle leveringsadresser"     (0002)
--   payment_method_requests  "Admin kan se alle betalingsanmodninger"  (0002)
--   orders                   "Kunde ser egne ordrer, admin ser alle"   (0011)
--   order_items              "Kunde ser egne ordrelinjer, admin ser alle" (0011)
--   campaign_codes           "Admin og superadmin kan se kampagnekoder" (0027)
--   vat_rules                "Admin og superadmin kan se momsregler"   (0029)
--
-- Da funktionen udelukkende bruges af disse syv admin-grene, tilføjes
-- AAL2-kravet ÉT sted, i selve funktionen — ikke i alle syv politikker
-- hver for sig. orders/order_items's kunde-gren ("customer_id = auth.uid()")
-- er en selvstændig OR-betingelse i samme policy-udtryk og påvirkes ikke:
-- en kunde der ser sine EGNE ordrer kræver stadig kun aal1, præcis som i
-- dag — kun admin-grenen skærpes.
--
-- profiles har desuden sin egen, uafhængige "Bruger kan se egen profil"-
-- policy (auth.uid() = id, migration 0001), som intet har med
-- is_admin_or_superadmin() at gøre. Permissive Postgres-policies for
-- samme kommando OR'es sammen, så denne ændring låser IKKE en bruger
-- midt i 2FA-opsætning (aal1) ude fra at læse sin egen profil — kun
-- admin-adgang til ANDRES data kræver nu aal2.

create or replace function public.is_admin_or_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'superadmin')
      and (select auth.jwt() ->> 'aal') = 'aal2'
  );
$$;
