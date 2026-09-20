-- 0030_vat_rules_invoice_notes.sql
-- Revisor har nu bekræftet de lovpligtige fakturatekster for de tre
-- eksisterende vat_rules-rækker (0029) — erstatter placeholderen
-- "AFVENTER REVISOR-BEKRÆFTELSE". Kun invoice_note ændres her; vat_rate
-- og vat_type er allerede korrekte og røres ikke. UPDATE pr. række
-- (ikke re-seed), så is_active m.fl. forbliver urørt.

update public.vat_rules
set invoice_note = 'Almindeligt salg med dansk moms.',
    updated_at = now()
where destination_country = 'DK';

update public.vat_rules
set invoice_note = 'Momsfrit salg – eksport af varer til Grønland, uden for EU''s momsområde. Kunden er importør og håndterer eventuelle lokale indførselsafgifter.',
    updated_at = now()
where destination_country = 'GL';

update public.vat_rules
set invoice_note = 'Momsfrit salg – eksport af varer til Færøerne, uden for EU''s momsområde. Kunden er importør og håndterer færøsk MVG samt eventuel told/afgift.',
    updated_at = now()
where destination_country = 'FO';
