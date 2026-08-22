-- Retter endnu et manglende grant: service_role havde kun SELECT på
-- profiles (det eneste der nogensinde var blevet brugt/testet før nu),
-- ikke UPDATE. I stedet for at rette gaps ét ad gangen, gives service_role
-- nu fuld adgang til alle eksisterende public-tabeller — hvilket er
-- konsistent med hvad service_role-nøglen er tiltænkt (fuld, betroet
-- backend-adgang, RLS er allerede bypasset for den under alle
-- omstændigheder, så dette udvider ikke den reelle tillidsgrænse).
--
-- Derudover sættes en default-privilege-regel, så FREMTIDIGE tabeller
-- automatisk arver samme adgang — forudsat de oprettes af samme rolle som
-- kører denne sætning (typisk postgres/supabase_admin via SQL Editor).
-- Det forhindrer denne præcise fejlklasse i at gentage sig for hver ny
-- tabel resten af Fase 2.

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.delivery_addresses to service_role;
grant select, insert, update, delete on public.payment_method_requests to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
