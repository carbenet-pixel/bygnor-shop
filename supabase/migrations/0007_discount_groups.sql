-- Fase 2: centrale rabatgrupper.

create table public.discount_groups (
  id text primary key,
  name text not null,
  discount_percent numeric(5, 2) not null,
  updated_at timestamptz not null default now()
);

insert into public.discount_groups (id, name, discount_percent) values
  ('standard', 'Standard', 0),
  ('soelv', 'Sølv', 5),
  ('guld', 'Guld', 10),
  ('platin', 'Platin', 15);

alter table public.discount_groups enable row level security;

create policy "Godkendte brugere kan se rabatgrupper"
  on public.discount_groups for select
  using (true);

grant select, insert, update, delete on public.discount_groups to service_role;
grant select on public.discount_groups to authenticated;

-- Ret profiles.discount_group til en rigtig FK. Eksisterende rækker uden
-- gruppe (null) backfildes til 'standard' først, ellers fejler NOT NULL.
update public.profiles set discount_group = 'standard' where discount_group is null;

alter table public.profiles
  alter column discount_group set default 'standard',
  alter column discount_group set not null,
  add constraint profiles_discount_group_fkey
    foreign key (discount_group) references public.discount_groups(id);
