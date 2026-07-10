-- Migratie: extra velden op transport_items voor terminal, gate en vertraging.
-- Uitvoeren via de SQL Editor.

alter table transport_items add column departure_terminal text;
alter table transport_items add column departure_gate text;
alter table transport_items add column arrival_terminal text;
alter table transport_items add column delay_minutes int;
