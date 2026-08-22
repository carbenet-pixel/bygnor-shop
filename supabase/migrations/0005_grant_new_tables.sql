-- Retter manglende grants på delivery_addresses og payment_method_requests
-- fra 0002. CREATE TABLE via SQL Editor gav ikke automatisk service_role/
-- authenticated adgang, så service_role fejlede med "permission denied",
-- og RLS-policyerne fra 0002 var reelt virkningsløse (en policy uden en
-- underliggende GRANT bliver aldrig konsulteret — adgangen afvises før RLS).

grant select, insert, update, delete on public.delivery_addresses to service_role;
grant select, insert, update, delete on public.payment_method_requests to service_role;

grant select on public.delivery_addresses to authenticated;
grant select on public.payment_method_requests to authenticated;
