-- 0022_subcategories.sql
-- Indfører et mellemlag mellem afdeling og produktgruppe. "Pido Bas" har i
-- dag 261+148=409 produkter i ét fladt niveau, hvilket er uoverskueligt.
-- Data-omkategoriseringen selv (category_id/subcategory_id på
-- product_groups, sletning af de nu tomme "Pido Volymsystem"/"Kassadisk"-
-- kategorier) er DML og køres af Claude via et script, ikke her.

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  name text not null,
  name_da text,
  slug text not null unique,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.product_groups add column subcategory_id uuid references public.subcategories(id);

create index idx_subcategories_category on public.subcategories(category_id);
create index idx_product_groups_subcategory on public.product_groups(subcategory_id);

alter table public.subcategories enable row level security;

-- service_role skal have et eksplicit grant, uanset RLS — CREATE TABLE via
-- SQL Editor giver det ikke automatisk (jf. 0005/0006/0008).
grant all on public.subcategories to service_role;
grant select on public.subcategories to authenticated;

create policy "Autentificerede kan læse subcategories" on public.subcategories
  for select using (auth.role() = 'authenticated');
