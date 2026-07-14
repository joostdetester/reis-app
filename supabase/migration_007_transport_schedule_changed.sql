-- Migratie: vlag op transport_items om aan te geven dat de vertrek- of aankomsttijd
-- gewijzigd is sinds de laatste keer dat het gezin dit gezien heeft. Wordt automatisch
-- gezet door de app bij het bewerken van vertrek-/aankomsttijd, en weer uitgezet zodra
-- iemand de waarschuwing bevestigt. Geen historie van de oude tijd zelf (per CLAUDE.md
-- geen versiehistorie in de UI) — alleen een "is gewijzigd"-signaal.
-- Uitvoeren via de SQL Editor.

alter table transport_items add column schedule_changed boolean not null default false;
