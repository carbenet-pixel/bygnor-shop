-- Retter en fejl i 0003: NOT NULL på terms_accepted_at/privacy_accepted_at
-- brød on_auth_user_created-triggeren fra 0001, som kun indsætter (id, role)
-- ved nye brugere. Ingen ny bruger kunne oprettes efter 0003 ("Database
-- error saving new user"), fordi triggerens bare insert violerede NOT NULL.
--
-- Håndhævelsen af "samtykke er påkrævet" sker allerede korrekt på
-- applikationsniveau i applyForAccount (afviser med terms_not_accepted FØR
-- nogen bruger oprettes) — disse to kolonner skal derfor være nullable,
-- ligesom alle øvrige felter fra 0002/0003, og udfyldes af den efterfølgende
-- update, akkurat som company_name/cvr_number m.fl.

alter table public.profiles
  alter column terms_accepted_at drop not null,
  alter column privacy_accepted_at drop not null;
