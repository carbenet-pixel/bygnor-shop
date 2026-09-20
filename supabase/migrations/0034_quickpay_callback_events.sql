-- 0034_quickpay_callback_events.sql
-- Sikkerhedsaudit-fund #7/#8: callback-handleren markerede en ordre betalt
-- ud fra ét enkelt, utilstrækkeligt tjek (accepted + operationstype), uden
-- at validere beløb/valuta/test-mode mod ordren, og en DB-fejl midt i
-- behandlingen blev i dag kvitteret til Quickpay som 2xx ("modtaget, prøv
-- ikke igen"), selvom intet reelt var gemt.
--
-- Denne tabel er det rå, holdbare log over ETHVERT modtaget callback —
-- skrevet FØR selve valideringen/statusovergangen i route.ts, så en
-- efterfølgende fejl i statusopdateringen aldrig kan tabes stille (en
-- fejlet INSERT her giver 5xx, så Quickpay retryer — de prøver op til 24
-- gange med stigende delay ved alt andet end 2xx/302/303, jf.
-- læringsdokumentationen).
--
-- quickpay_payment_id + operation_id er nøglen til idempotens: Quickpays
-- operations[].id er KUN unik inden for den enkelte betaling (den er
-- sekventiel pr. payment, ikke global) — operation_id alene kan derfor
-- forveksle operation #1 på én betaling med operation #1 på en anden.
-- Se route.ts for selve opslaget.
create table public.quickpay_callback_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  quickpay_payment_id text,
  operation_id text,
  payload jsonb not null,
  outcome text not null default 'modtaget'
    check (outcome in (
      'modtaget',
      'betalt',
      'betaling_fejlet',
      'kraever_gennemsyn',
      'allerede_behandlet',
      'ignoreret'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ikke en unik constraint: Quickpay kan i teorien gensende samme operation
-- flere gange, og hvert forsøg skal fortsat kunne ses i loggen som sin egen
-- række (en unik constraint ville tvinge os til at afvise eller opdatere
-- in-place, hvilket skjuler at et duplikat overhovedet ankom).
create index idx_quickpay_callback_events_operation_id
  on public.quickpay_callback_events(operation_id);

-- Den faktiske idempotens-lookup i route.ts filtrerer på BEGGE felter
-- sammen (se kommentaren ovenfor om operation_id's begrænsede unikhed) —
-- dette sammensatte index er det der reelt bruges til det opslag.
create index idx_quickpay_callback_events_payment_operation
  on public.quickpay_callback_events(quickpay_payment_id, operation_id);

create index idx_quickpay_callback_events_order_id
  on public.quickpay_callback_events(order_id);

alter table public.quickpay_callback_events enable row level security;

grant all on public.quickpay_callback_events to service_role;
-- Bevidst INGEN grant til authenticated — rent internt log-/driftsskema,
-- samme mønster som campaign_codes/vat_rules/product_costs (0032).
