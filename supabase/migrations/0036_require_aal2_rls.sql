-- 0036_require_aal2_rls.sql
-- Sikkerhedsaudit-fund #4: signInWithPassword() opretter en fuldt gyldig
-- session FØR redirect til /login/verify — intet forhindrede et direkte
-- besøg på en beskyttet side/handling i stedet, hvilket sprang selve
-- 2FA-bekræftelsen helt over. lib/admin-guard.ts's requireRole() lukker
-- dette for admin Server Actions; denne migration lukker det samme hul på
-- selve databaselaget, for ALT authenticated-adgang, ikke kun admin-siden.
--
-- Bekræftet mod Supabases egen dokumentation (ikke antaget): aal-claimet
-- ligger i selve JWT'et og læses i RLS via (select auth.jwt()->>'aal').
-- "as restrictive" er det dokumenterede mønster her — lægger sig OVENPÅ
-- alle eksisterende permissive policies i stedet for at skulle omskrive
-- dem hver især.
--
-- Sikkert at gøre bredt: MFA er allerede obligatorisk for enhver konto
-- (login/page.tsx sender enhver uden TOTP-faktor til /login/setup-2fa, og
-- selve enrollmentet løfter sessionen til aal2 med det samme via
-- challengeAndVerify — samme kald som /login/verify bruger). Ingen
-- legitim, fuldt onboardet konto kan derfor blive permanent låst ude af
-- dette — kun midlertidigt, indtil 2FA-skærmen er bestået, hvilket er
-- hele pointen. Scope (bekræftet): alle tabeller der i dag er grantet til
-- authenticated, ikke kun de følsomme.
--
-- profiles har et bekræftet, levende SELECT-grant til authenticated i den
-- faktiske database, som IKKE findes i nogen sporet migration-fil (kun
-- "grant update (phone)" i 0026 er sporet) — formentlig sat manuelt uden
-- for migrationskæden på et tidspunkt. Nævnes her, ikke rettet i denne
-- migration: en restriktiv policy er harmløs at tilføje uanset om et givet
-- grant findes eller ej (den kan kun indskrænke adgang der allerede findes
-- via et grant, aldrig give ny adgang), så det blokerer ikke denne opgave
-- — men er værd at få afstemt/sporet separat.

create policy "Kræver bekræftet 2FA (AAL2)" on public.profiles
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Kræver bekræftet 2FA (AAL2)" on public.delivery_addresses
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Kræver bekræftet 2FA (AAL2)" on public.payment_method_requests
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Kræver bekræftet 2FA (AAL2)" on public.discount_groups
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Kræver bekræftet 2FA (AAL2)" on public.vendors
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Kræver bekræftet 2FA (AAL2)" on public.categories
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Kræver bekræftet 2FA (AAL2)" on public.product_groups
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Kræver bekræftet 2FA (AAL2)" on public.products
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Kræver bekræftet 2FA (AAL2)" on public.subcategories
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Kræver bekræftet 2FA (AAL2)" on public.carts
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Kræver bekræftet 2FA (AAL2)" on public.cart_items
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Kræver bekræftet 2FA (AAL2)" on public.orders
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');

create policy "Kræver bekræftet 2FA (AAL2)" on public.order_items
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2');
