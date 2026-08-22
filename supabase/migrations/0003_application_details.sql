-- Fase 2: yderligere ansøgningsfelter på profiles.
-- Rører ikke eksisterende kolonner/policies fra 0001/0002 — kun tilføjelser.

alter table public.profiles
  add column phone text,
  -- Kundens ønske/tilkendegivelse — ikke det faktiske payment_method, som
  -- ved selvbetjening altid sættes til 'kort' uanset denne værdi.
  add column preferred_payment text check (preferred_payment in ('kort', 'kredit')),
  add column expected_category text,
  add column expected_annual_volume text,
  add column existing_customer boolean not null default false,
  add column application_comment text;

-- NOT NULL fra starten af, men "default now()" ved tilføjelsen backfilder
-- automatisk eksisterende rækker (test-brugere m.fl.), så migrationen ikke
-- fejler på dem. Defaulten fjernes bagefter, så alle NYE rækker skal angive
-- værdien eksplicit — der findes intet ægte samtykke-tidspunkt for de
-- rækker der fandtes før denne kolonne, kun et backfill-tidsstempel.
alter table public.profiles
  add column terms_accepted_at timestamptz not null default now(),
  add column privacy_accepted_at timestamptz not null default now();

alter table public.profiles
  alter column terms_accepted_at drop default,
  alter column privacy_accepted_at drop default;
