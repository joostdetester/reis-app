-- Eenmalige insert van de trip-rij. Uitvoeren na schema.sql, via de Supabase SQL Editor.
--
-- access_token_hash is de sha256(hex) van de edit-token. De platte token zelf staat
-- NERGENS in de repo (per CLAUDE.md: geen gevoelige keys/tokens committen) — die is
-- alleen gedeeld met de gebruiker om de geheime link mee samen te stellen en te bewaren
-- (bv. in een wachtwoordmanager). Bij verlies: nieuwe token genereren, hash bijwerken
-- met een UPDATE-statement, en een nieuwe link rondsturen.

insert into trips (name, slug, start_date, end_date, access_token_hash)
values (
  'Filipijnen 2026',
  'EmYVjmC08pGL', -- moet gelijk zijn aan VITE_TRIP_SLUG in .env.local
  '2026-07-23',
  '2026-08-13',
  '81df8d3f4b583914411ce95e743cff6334da47115840cbe6574bcb24ec72dd71'
);
