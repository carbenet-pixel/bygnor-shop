-- 0035_is_active_profile_lockdown.sql
-- Sikkerhedsaudit-fund #5: is_active blev kun håndhævet ved besøg på /shop
-- (proxy.ts) — selve databasepolicyerne tjekkede den slet ikke, så en
-- deaktiveret kunde med en stadig gyldig session kunne fortsætte med at
-- bruge de tilladte Supabase-API'er direkte (kurv, ordrer, adresser,
-- profil), udenom Next.js-appen helt.
--
-- Øjeblikkelig, fuldstændig lukning kræver RLS, ikke session-tilbagekaldelse
-- — Supabase Admin API'et tilbyder ingen "log denne bruger-id ud alle
-- steder"-metode (kun signOut(jwt), som kræver selve den levende JWT, som
-- vi ikke opbevarer server-side). ban_duration (sat i lib/customers.ts's
-- updateCustomer()) er et ekstra lag der forhindrer nyt login/token-
-- refresh, men et allerede udstedt, endnu-ikke-udløbet access token ville
-- stadig bestå den uden dette. Denne migration er derfor den reelle,
-- øjeblikkelige spærring.
--
-- Scope (bekræftet forretningsregel): kunde-konti fuldt låst ude —
-- ikke kun nye handlinger, også læsning af egne data. Admin/superadmin er
-- ALDRIG påvirket af is_active, uanset værdi (samme princip som proxy.ts's
-- eksisterende "Deaktivering gælder kun kunde-rollen"-kommentar). Ingen
-- deaktiverings-UI for stab-konti bygges i denne omgang.

create or replace function public.is_active_profile()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role in ('admin', 'superadmin') or (role = 'kunde' and is_active))
  );
$$;

-- "as restrictive", ikke en ekstra "and"-betingelse tilføjet til de
-- eksisterende permissive policies: hver af de seks tabeller har BÅDE en
-- kunde-scoped policy (customer_id = auth.uid()) OG i flere tilfælde en
-- separat admin-policy (is_admin_or_superadmin()) — de er selvstændige
-- OR-grene. At redigere kunde-policyen alene ville kræve at genskrive hver
-- af dem præcist rigtigt og risikere utilsigtet at ramme admin-grenen ved
-- en fejl. En restriktiv policy lægger sig i stedet OVENPÅ alle permissive
-- policies på tabellen (Postgres RLS: samlet synlighed = (OR af permissive)
-- AND (AND af restriktive)) — og fordi is_active_profile() selv altid
-- returnerer true for admin/superadmin, låser den IKKE admin-adgangen,
-- kun kunde-grenen, præcis som ønsket. Ingen eksisterende policy-tekst
-- rørt.
create policy "Deaktiveret kunde spærres helt" on public.carts
  as restrictive
  for all
  to authenticated
  using (public.is_active_profile())
  with check (public.is_active_profile());

create policy "Deaktiveret kunde spærres helt" on public.cart_items
  as restrictive
  for all
  to authenticated
  using (public.is_active_profile())
  with check (public.is_active_profile());

create policy "Deaktiveret kunde spærres helt" on public.orders
  as restrictive
  for all
  to authenticated
  using (public.is_active_profile())
  with check (public.is_active_profile());

create policy "Deaktiveret kunde spærres helt" on public.order_items
  as restrictive
  for all
  to authenticated
  using (public.is_active_profile())
  with check (public.is_active_profile());

create policy "Deaktiveret kunde spærres helt" on public.delivery_addresses
  as restrictive
  for all
  to authenticated
  using (public.is_active_profile())
  with check (public.is_active_profile());

create policy "Deaktiveret kunde spærres helt" on public.profiles
  as restrictive
  for all
  to authenticated
  using (public.is_active_profile())
  with check (public.is_active_profile());
