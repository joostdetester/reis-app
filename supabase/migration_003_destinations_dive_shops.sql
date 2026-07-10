-- Migratie: dive_shops-kolom op destinations (top-3 PADI-duikbedrijven per eiland).
-- Uitvoeren via de SQL Editor.

alter table destinations add column dive_shops jsonb;
