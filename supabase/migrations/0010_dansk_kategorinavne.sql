-- Data-rettelse (ikke skema): kategorinavne fra Pido_katalog_2026.xlsx var
-- på svensk — rettes til dansk. "Belysning" er allerede identisk og
-- kræver ingen opdatering.

update public.categories set name = 'Kassedisk' where name = 'Kassadisk';
update public.categories set name = 'Lagerinventar' where name = 'Lagerinredning';
update public.categories set name = 'Pido Basissystem' where name = 'Pido Bas';
update public.categories set name = 'Pido Volumensystem' where name = 'Pido Volymsystem';
