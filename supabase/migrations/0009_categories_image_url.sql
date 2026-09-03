-- Fase 3 (opfølgning): felt til fremtidig manuel kuratering af et
-- kategori-billede. Ikke i brug endnu — udfyldes når admin-redigering af
-- kategorier bygges. Ingen nye grants nødvendige, da 0008 allerede gav
-- service_role/authenticated adgang på tabel-niveau.

alter table public.categories add column image_url text;
