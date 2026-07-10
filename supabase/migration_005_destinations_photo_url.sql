-- Migratie: photo_url op destinations (foto per bestemming/eiland op de Bestemmingen-pagina).
-- Uitvoeren via de SQL Editor.

alter table destinations add column photo_url text;
