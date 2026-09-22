-- 0037_increment_cart_item.sql
-- Sikkerhedsaudit-fund #14 (del 2): addToCart() brugte et read-then-write-
-- mønster (læs nuværende antal, beregn nyt antal, skriv det tilbage) — to
-- næsten samtidige "læg i kurv"-forsøg (dobbeltklik, to faner) kunne race,
-- så den ene tilføjelse stille blev overskrevet af den anden i stedet for
-- lagt sammen.
--
-- SECURITY INVOKER, IKKE DEFINER (modsat create_customer_order(), 0033):
-- denne funktion skal ikke have udvidede rettigheder — den kører som
-- kunden selv, og den eksisterende RLS-policy ("Kunde ser og redigerer
-- egne kurv-varer", 0011) gælder derfor uændret. Funktionen giver ingen
-- adgang kunden ikke allerede havde via cart_items' eksisterende
-- insert/update-grants til authenticated — den gør blot selve
-- sammenlægningen atomisk i ét statement i stedet for to omgange fra
-- applikationskoden.
--
-- unique(cart_id, product_id) fra 0011 er allerede konflikt-målet her —
-- ingen ny constraint nødvendig, bekræftet mod migrationsfilen før denne
-- blev skrevet.
create or replace function public.increment_cart_item(
  p_cart_id uuid,
  p_product_id uuid,
  p_delta int
)
returns public.cart_items
language sql
security invoker
set search_path = public
as $$
  insert into public.cart_items (cart_id, product_id, quantity)
  values (p_cart_id, p_product_id, p_delta)
  on conflict (cart_id, product_id)
  do update set quantity = public.cart_items.quantity + excluded.quantity
  returning *;
$$;

grant execute on function public.increment_cart_item to authenticated;
