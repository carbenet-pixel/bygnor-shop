-- Fase 2: kunde-datamodel (virksomhedsoplysninger, leveringsadresser, betalingsanmodninger)
-- Rører ikke eksisterende kolonner/policies fra 0001 — kun tilføjelser.

-- Udvid profiles med virksomheds- og betalingsfelter
alter table public.profiles
  add column company_name text,
  add column cvr_number text,
  add column cvr_verified_at timestamptz,
  add column payment_method text check (payment_method in ('kort', 'kredit')),
  add column discount_group text,
  add column individual_discount numeric(5, 2),
  add column credit_limit numeric(12, 2),
  add column payment_terms_days integer,
  add column is_active boolean not null default true,
  add column created_by text check (created_by in ('self_service', 'admin'));

-- Leveringsadresser — en kunde kan have flere
create table public.delivery_addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  contact_name text,
  phone text,
  street_address text not null,
  postal_code text,
  city text,
  country text not null,
  notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Kun én standardadresse pr. profil
create unique index delivery_addresses_one_default_per_profile
  on public.delivery_addresses (profile_id)
  where is_default;

alter table public.delivery_addresses enable row level security;

-- Betalingsmetode-anmodninger (kort -> kredit-opgradering).
-- Kun skema for nu — selve ansøgnings-/godkendelsesflowet bygges i en senere omgang.
create table public.payment_method_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'afventer' check (status in ('afventer', 'godkendt', 'afvist')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_method_requests enable row level security;

-- Delt hjælpefunktion: er den kaldende bruger admin eller superadmin?
-- SECURITY DEFINER, så opslaget i profiles ikke selv rammer RLS'en igen (undgår rekursion),
-- og search_path er låst for at undgå search_path-hijacking i en SECURITY DEFINER-funktion.
create or replace function public.is_admin_or_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

-- profiles: admin/superadmin kan se alle profiler (kunder kan i forvejen kun se egen, jf. 0001)
create policy "Admin kan se alle profiler"
  on public.profiles for select
  using (public.is_admin_or_superadmin());

-- delivery_addresses: bruger kan se egne adresser, admin/superadmin kan se alle
create policy "Bruger kan se egne leveringsadresser"
  on public.delivery_addresses for select
  using (auth.uid() = profile_id);

create policy "Admin kan se alle leveringsadresser"
  on public.delivery_addresses for select
  using (public.is_admin_or_superadmin());

-- payment_method_requests: samme mønster. Kun select-policies for nu — ingen
-- insert/update-policies før selve anmodnings-/godkendelsesflowet er bygget.
create policy "Bruger kan se egne betalingsanmodninger"
  on public.payment_method_requests for select
  using (auth.uid() = profile_id);

create policy "Admin kan se alle betalingsanmodninger"
  on public.payment_method_requests for select
  using (public.is_admin_or_superadmin());
