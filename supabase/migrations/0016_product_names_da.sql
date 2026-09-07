-- 0016_product_names_da.sql
-- products.name forbliver det oprindelige svenske Pido-navn (bruges bl.a.
-- til fakturanotifikationen til salg, som skal forblive svensk til
-- bestilling hos Pido). name_da er det danske visningsnavn til GUI og
-- kundevendte mails — nullable, da fremtidige nye produkter kan mangle en
-- oversættelse indtil videre.

alter table public.products add column name_da text;

-- Samme snapshot-princip som allerede gælder for pris: begge navne
-- fastfryses ved ordre-oprettelse, uanset senere ændringer i produktet.
-- name_snapshot forbliver svensk (uændret), name_snapshot_da er det nye.
alter table public.order_items add column name_snapshot_da text;
