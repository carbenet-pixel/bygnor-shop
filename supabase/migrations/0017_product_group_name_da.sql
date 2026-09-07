-- 0017_product_group_name_da.sql
-- product_groups.name er svensk (fra den oprindelige Pido-import), og der
-- findes ingen oversættelse af selve gruppenavnet — kun på de enkelte
-- produkter (products.name_da). Nullable, ikke udfyldt endnu: indtil en
-- rigtig dansk gruppetitel kurateres manuelt, falder katalogets visning
-- tilbage til det alfabetisk første medlems name_da (se lib/catalog.ts).

alter table public.product_groups add column name_da text;
