create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text not null default 'kunde' check (role in ('superadmin', 'admin', 'kunde')),
  full_name text,
  created_at timestamptz default now()
);

-- Aktiver RLS
alter table public.profiles enable row level security;

-- Bruger kan kun se sin egen profil
create policy "Bruger kan se egen profil"
  on public.profiles for select
  using (auth.uid() = id);

-- Trigger der opretter profil automatisk ved ny bruger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'kunde');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
