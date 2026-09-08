-- 0021_products_sku_unique_per_vendor.sql
-- products.sku var globalt unikt (migration 0008), hvilket kun holder så
-- længe der er én leverandør. To uafhængige leverandører kan sagtens bruge
-- samme interne varenummer. Verificeret live før denne migration skrives:
-- 0 rækker krænker (vendor_id, sku)-unikhed i den nuværende produktion
-- (450 produkter, alle Pido) — så ingen datamigrering nødvendig.

alter table public.products drop constraint products_sku_key;

alter table public.products add constraint products_vendor_id_sku_key unique (vendor_id, sku);
