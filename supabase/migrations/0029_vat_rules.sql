-- 0029_vat_rules.sql
-- Momsstruktur klar til at blive udfyldt med de korrekte satser/lovtekster,
-- når revisoren har bekræftet dem. invoice_note er bevidst en tydelig
-- placeholder ("AFVENTER REVISOR-BEKRÆFTELSE") for alle tre rækker — INGEN
-- antagelse om den faktiske lovpligtige fakturatekst er lavet her.
--
-- Ikke i scope (afventer revisor): fragtens momsbehandling,
-- dokumentationskrav for eksportbevis, EU-omvendt betalingspligt.

create table public.vat_rules (
  destination_country text primary key,
  vat_rate numeric(5, 2) not null,
  vat_type text not null,
  invoice_note text not null default '',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.vat_rules
  (destination_country, vat_rate, vat_type, invoice_note, is_active)
values
  ('DK', 25, 'domestic', 'AFVENTER REVISOR-BEKRÆFTELSE', true),
  ('GL', 0, 'export_non_eu', 'AFVENTER REVISOR-BEKRÆFTELSE', true),
  ('FO', 0, 'export_non_eu', 'AFVENTER REVISOR-BEKRÆFTELSE', true);

alter table public.vat_rules enable row level security;

grant select, insert, update, delete on public.vat_rules to service_role;

-- Bevidst INGEN grant til authenticated, samme mønster som campaign_codes
-- (migration 0027) — opslag ved ordreoprettelse sker udelukkende server-side
-- via service_role. RLS-policyen nedenfor er kun forsvar i dybden, til
-- admin-UI'ets egen visning.
create policy "Admin og superadmin kan se momsregler" on public.vat_rules
  for select using (public.is_admin_or_superadmin());

-- Snapshot ved ordreoprettelse, samme "frys på ordretidspunktet"-princip
-- som sku_snapshot/campaign_code_snapshot — en senere redigering af
-- vat_rules må ikke ændre allerede oprettede ordrer. Nullable, da
-- eksisterende ordrer fra før denne migration ikke har et snapshot.
alter table public.orders
  add column vat_rate numeric(5, 2),
  add column vat_type text,
  add column vat_destination text,
  add column vat_note text;
