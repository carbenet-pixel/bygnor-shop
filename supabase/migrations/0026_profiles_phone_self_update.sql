-- 0026_profiles_phone_self_update.sql
-- profiles har hidtil kun haft eksplicit skriveadgang for service_role
-- (migration 0006) — ingen kunde har før nu måttet skrive til sin egen
-- profil-række direkte, alt gik gennem admin's service-role-kald. phone
-- er det ENESTE felt kunden selv må ændre (se app/shop/konto/indstillinger)
-- — derfor et KOLONNE-specifikt GRANT, ikke et bredt UPDATE på hele
-- tabellen. Uden det ville RLS-policyen nedenfor (som kun afgrænser
-- RÆKKER, ikke kolonner) lade en kunde omgå UI'et og skrive til fx
-- discount_group/is_active/invoice_approved på egen række via et
-- direkte API-kald.

grant update (phone) on public.profiles to authenticated;

create policy "Bruger kan opdatere eget telefonnummer" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
