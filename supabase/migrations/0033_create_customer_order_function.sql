-- 0033_create_customer_order_function.sql
-- Den ENESTE vej til at oprette en ordre, nu hvor 0032 har fjernet kundens
-- direkte INSERT-adgang til orders/order_items. Genspejler (og er nu den
-- AUTORITATIVE version af) prisberegningen i:
--   lib/discount-groups.ts (getCustomerDiscount — MAX af gruppe/individuel)
--   lib/campaign-codes.ts (validateCampaignCode/computeLineDiscount)
--   lib/vat-rules.ts (resolveVatSnapshot/computeVatBreakdown)
-- Disse TS-funktioner rører vi IKKE — de bruges fortsat til kurv-sidens
-- forhåndsvisning FØR checkout. Denne funktion er sandheden NÅR ordren
-- reelt oprettes. Ændres reglerne ét sted, skal de opdateres begge steder
-- — se kommentaren i lib/vat-rules.ts.
--
-- Ingen klient-leveret pris, rabat, moms eller status accepteres nogen
-- steder i denne funktion — alt slås op/genberegnes her, server-side, i
-- funktionens egen transaktion (plpgsql-funktioner er atomiske: enhver
-- exception ruller ALT i kaldet tilbage, inklusive et allerede indsat
-- ordrehoved).

create or replace function public.create_customer_order(
  p_customer_id uuid,
  p_items jsonb, -- [{"product_id": uuid, "quantity": int}, ...] — INGEN priser
  p_payment_method text, -- 'kort' | 'faktura'
  p_delivery_recipient_name text,
  p_delivery_address_line1 text,
  p_delivery_address_line2 text,
  p_delivery_postal_code text,
  p_delivery_city text,
  p_delivery_country text,
  p_campaign_code text default null
)
returns table (
  order_id uuid,
  order_reference text,
  subtotal_amount numeric,
  vat_amount numeric,
  total_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_approved boolean;
  v_discount_group text;
  v_individual_discount numeric;
  v_group_discount_percent numeric;
  v_group_name text;
  v_discount_percent numeric;
  v_discount_label text;
  v_external_customer_number text;
  v_campaign_id uuid;
  v_campaign_vendor_id uuid;
  v_campaign_discount_type text;
  v_campaign_discount_value numeric;
  v_country_code text;
  v_vat_rate numeric;
  v_vat_type text;
  v_vat_note text;
  v_subtotal numeric := 0;
  v_has_priced_line boolean := false;
  v_vat_amount numeric;
  v_total numeric;
  v_item jsonb;
  v_product_id uuid;
  v_quantity int;
  v_product record;
  v_customer_price numeric;
  v_campaign_price numeric;
  v_line_unit_price numeric;
  v_line_campaign_discount numeric;
  v_lines jsonb := '[]'::jsonb;
  v_order_id uuid;
  v_order_reference text;
  v_attempt int;
begin
  -- 1) Betalingsmetode + fakturagodkendelse — genbruger uændret den
  -- eksisterende regel fra initiateInvoiceCheckoutAction (profiles.invoice_approved).
  if p_payment_method not in ('kort', 'faktura') then
    raise exception 'Ugyldig betalingsmetode.';
  end if;

  if p_payment_method = 'faktura' then
    select invoice_approved into v_invoice_approved
    from public.profiles where id = p_customer_id;

    if v_invoice_approved is not true then
      raise exception 'Din konto er ikke godkendt til fakturabetaling.';
    end if;
  end if;

  -- 2) Kundens rabat — samme MAX(gruppe, individuel)-regel som
  -- lib/discount-groups.ts's getCustomerDiscount() ("bekræftet af Søren").
  select discount_group, individual_discount, external_customer_number
    into v_discount_group, v_individual_discount, v_external_customer_number
  from public.profiles where id = p_customer_id;

  select discount_percent, name into v_group_discount_percent, v_group_name
  from public.discount_groups where id = v_discount_group;

  v_group_discount_percent := coalesce(v_group_discount_percent, 0);
  v_group_name := coalesce(v_group_name, 'Standard');

  -- numeric(5,2)::text viser altid to decimaler ("5.00"), hvor TS's
  -- template-literal på et almindeligt JS-tal viser "5" — regexp_replace
  -- fjerner et overflødigt ".00"/trailing nuller, så discount_label ser ud
  -- som i dag ("Sølv (5%)", ikke "Sølv (5.00%)").
  if v_individual_discount is not null and v_individual_discount > v_group_discount_percent then
    v_discount_percent := v_individual_discount;
    v_discount_label := 'Individuel rabat (' ||
      regexp_replace(v_individual_discount::text, '\.?0+$', '') || '%)';
  else
    v_discount_percent := v_group_discount_percent;
    v_discount_label := v_group_name || ' (' ||
      regexp_replace(v_group_discount_percent::text, '\.?0+$', '') || '%)';
  end if;

  -- 3) Kampagnekode — samme regler som lib/campaign-codes.ts's
  -- validateCampaignCode(). Tomt/ikke angivet felt = ingen kode, ikke en
  -- fejl. En UGYLDIG kode afviser derimod hele ordren.
  if p_campaign_code is not null and length(trim(p_campaign_code)) > 0 then
    select id, vendor_id, discount_type, discount_value
      into v_campaign_id, v_campaign_vendor_id, v_campaign_discount_type, v_campaign_discount_value
    from public.campaign_codes
    where code = upper(trim(p_campaign_code))
      and is_active = true
      and now() >= start_date
      and now() <= end_date;

    if v_campaign_id is null then
      raise exception 'Ugyldig eller udløbet kampagnekode.';
    end if;
  end if;

  -- 4) Moms — samme landekode-mapping som lib/vat-rules.ts's
  -- resolveVatSnapshot(). Modsat TS-versionen fejler denne LUKKET: intet
  -- match (ukendt land, eller ingen aktiv regel) afviser hele ordren i
  -- stedet for stiltiende at antage 0% moms (audit-fund).
  v_country_code := case lower(trim(p_delivery_country))
    when 'danmark' then 'DK'
    when 'denmark' then 'DK'
    when 'dk' then 'DK'
    when 'grønland' then 'GL'
    when 'greenland' then 'GL'
    when 'gl' then 'GL'
    when 'færøerne' then 'FO'
    when 'faroe islands' then 'FO'
    when 'fo' then 'FO'
    else null
  end;

  if v_country_code is null then
    raise exception 'Ukendt leveringsland — kan ikke beregne moms for denne ordre.';
  end if;

  select vat_rate, vat_type, invoice_note into v_vat_rate, v_vat_type, v_vat_note
  from public.vat_rules
  where destination_country = v_country_code and is_active = true;

  if v_vat_rate is null then
    raise exception 'Ingen aktiv momsregel for leveringslandet — kan ikke gennemføre ordren.';
  end if;

  -- 5) Ordrelinjer — genfetcher og genvalidérer HVER vare her, i denne
  -- transaktion. "for update" låser rækken mod en samtidig prisændring
  -- fra admin, mens ordren oprettes.
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Kurven er tom.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::int;

    if v_product_id is null or v_quantity is null or v_quantity < 1 then
      raise exception 'Ugyldig vare eller antal i kurven.';
    end if;

    select id, sku, name, name_da, base_price, vendor_id, active, price_on_request
      into v_product
    from public.products
    where id = v_product_id
    for update;

    if v_product.id is null then
      raise exception 'Et produkt i kurven findes ikke længere.';
    end if;

    if v_product.active is not true then
      raise exception 'Et produkt i kurven er ikke længere tilgængeligt.';
    end if;

    if v_product.price_on_request is true then
      raise exception 'Et produkt i kurven kræver et tilbud og kan ikke bestilles direkte.';
    end if;

    if v_product.base_price is not null and v_product.base_price < 0 then
      -- Bør ikke kunne ske (products_base_price_non_negative, 0032), men
      -- afvises eksplicit her også — dobbelt sikring omkring selve beløbet.
      raise exception 'Ugyldig pris for et produkt i kurven.';
    end if;

    if v_product.base_price is null then
      -- Kort tillader IKKE varer uden pris (kunden kan ikke sendes til
      -- betaling for et ukendt beløb) — samme tjek som i dag i
      -- initiateCardCheckoutAction, blot ét niveau strengere end
      -- faktura-sporet: én enkelt uprissat linje blokerer hele
      -- kort-checkout'en, ikke kun "alle linjer uden pris".
      if p_payment_method = 'kort' then
        raise exception 'Kurven indeholder varer uden pris endnu — fjern dem, eller vent til prisen er sat, før du kan gå til betaling.';
      end if;

      -- "Pris oplyses snarest" — linjen oprettes uden pris, samme
      -- opførsel som insertOrderItems() i dag.
      v_lines := v_lines || jsonb_build_object(
        'product_id', v_product.id,
        'sku_snapshot', v_product.sku,
        'name_snapshot', v_product.name,
        'name_snapshot_da', v_product.name_da,
        'base_price_snapshot', null,
        'unit_price_snapshot', null,
        'campaign_discount_snapshot', null,
        'quantity', v_quantity
      );
      continue;
    end if;

    v_has_priced_line := true;

    -- Samme "bedst af kundens egen rabat ELLER kampagnekode, aldrig
    -- begge"-regel som lib/campaign-codes.ts's computeLineDiscount().
    v_customer_price := round(v_product.base_price * (1 - v_discount_percent / 100), 2);
    v_line_unit_price := v_customer_price;
    v_line_campaign_discount := null;

    if v_campaign_id is not null
       and (v_campaign_vendor_id is null or v_campaign_vendor_id = v_product.vendor_id) then
      if v_campaign_discount_type = 'percent' then
        v_campaign_price := round(v_product.base_price * (1 - v_campaign_discount_value / 100), 2);
      else
        v_campaign_price := round(greatest(0, v_product.base_price - v_campaign_discount_value), 2);
      end if;

      if v_campaign_price < v_customer_price then
        v_line_unit_price := v_campaign_price;
        v_line_campaign_discount := round(v_product.base_price - v_campaign_price, 2);
      end if;
    end if;

    v_subtotal := v_subtotal + (v_line_unit_price * v_quantity);

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'sku_snapshot', v_product.sku,
      'name_snapshot', v_product.name,
      'name_snapshot_da', v_product.name_da,
      'base_price_snapshot', v_product.base_price,
      'unit_price_snapshot', v_line_unit_price,
      'campaign_discount_snapshot', v_line_campaign_discount,
      'quantity', v_quantity
    );
  end loop;

  -- Kort kræver en kendt totalpris (kan ikke sende kunden til betaling for
  -- et ukendt beløb) — faktura tillader fortsat linjer uden pris, sælger
  -- følger op manuelt. Samme regel som i dag i checkout-actions.ts.
  if not v_has_priced_line then
    if p_payment_method = 'kort' then
      raise exception 'Kurven indeholder varer uden pris endnu.';
    end if;
    v_subtotal := null;
    v_vat_amount := null;
    v_total := null;
  else
    v_subtotal := round(v_subtotal, 2);
    v_vat_amount := round(v_subtotal * v_vat_rate / 100, 2);
    v_total := round(v_subtotal + v_vat_amount, 2);
  end if;

  -- 6) Ordrehoved — status afledes UDELUKKENDE af payment_method her,
  -- modtages ALDRIG som parameter (lukker "kunde indsætter status='betalt'
  -- direkte"-hullet helt, ikke kun ved validering).
  for v_attempt in 1..5 loop
    v_order_reference := substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);

    begin
      insert into public.orders (
        customer_id, delivery_recipient_name, delivery_address_line1,
        delivery_address_line2, delivery_postal_code, delivery_city,
        delivery_country, payment_method, status, subtotal_amount,
        vat_amount, total_amount, order_reference, discount_percent,
        discount_label, external_customer_number_snapshot,
        campaign_code_snapshot, vat_rate, vat_type, vat_destination, vat_note
      ) values (
        p_customer_id, p_delivery_recipient_name, p_delivery_address_line1,
        p_delivery_address_line2, p_delivery_postal_code, p_delivery_city,
        p_delivery_country,
        p_payment_method,
        case when p_payment_method = 'kort' then 'afventer_betaling' else 'afventer' end,
        v_subtotal, v_vat_amount, v_total, v_order_reference, v_discount_percent,
        v_discount_label, v_external_customer_number,
        case when v_campaign_id is not null then upper(trim(p_campaign_code)) else null end,
        v_vat_rate, v_vat_type, v_country_code, v_vat_note
      )
      returning id into v_order_id;

      exit;
    exception when unique_violation then
      if v_attempt = 5 then
        raise exception 'Kunne ikke generere et unikt ordre-id. Prøv igen.';
      end if;
    end;
  end loop;

  -- 7) Ordrelinjer — samme transaktion som ordrehovedet. En exception her
  -- ruller ordrehovedet ovenfor tilbage automatisk (ingen forældreløs
  -- ordre, i modsætning til dagens to-trins INSERT fra checkout-actions.ts).
  insert into public.order_items (
    order_id, product_id, sku_snapshot, name_snapshot, name_snapshot_da,
    base_price_snapshot, unit_price_snapshot, campaign_discount_snapshot, quantity
  )
  select
    v_order_id,
    (l ->> 'product_id')::uuid,
    l ->> 'sku_snapshot',
    l ->> 'name_snapshot',
    l ->> 'name_snapshot_da',
    (l ->> 'base_price_snapshot')::numeric,
    (l ->> 'unit_price_snapshot')::numeric,
    (l ->> 'campaign_discount_snapshot')::numeric,
    (l ->> 'quantity')::int
  from jsonb_array_elements(v_lines) as l;

  return query select v_order_id, v_order_reference, v_subtotal, v_vat_amount, v_total;
end;
$$;

-- Ingen direkte kundeadgang — kun kaldbar fra betroet server-kode via
-- service_role (samme princip som campaign_codes/vat_rules: "ingen grant
-- til authenticated"). customer_id modtages som parameter og er kun sikkert
-- at stole på FORDI kalderen (checkout-actions.ts) allerede har valideret
-- kundens session via getUser(), FØR denne funktion kaldes — funktionen
-- selv autentificerer intet.
revoke all on function public.create_customer_order from public;
grant execute on function public.create_customer_order to service_role;
