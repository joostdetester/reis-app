-- Migratie: schakelaar om de vluchtstatus-API (AeroDataBox) helemaal uit te zetten,
-- om binnen de quota van het gratis abonnement te blijven. Alleen zichtbaar/bruikbaar
-- voor wie via de edit-token is ingelogd (zie hasEditAccess in de frontend).
-- Uitvoeren via de SQL Editor.

alter table trips add column flight_status_api_enabled boolean not null default true;
