-- 0028_subcategory_hero_image.sql
-- "Blomsterinredning" og lignende er underkategorier (subcategories), ikke
-- top-level kategorier (categories har kun 3 rækker: Pido Basissystem,
-- Belysning, Lagerinventar) — kolonnen tilføjes derfor på subcategories.
-- Navnet er bevidst bevaret som bedt om (category_hero_image_url), selvom
-- den semantisk er et underkategori-felt.

alter table public.subcategories add column category_hero_image_url text;
