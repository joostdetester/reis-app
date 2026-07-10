-- Migratie: photo_url op accommodations. Er zijn geen betrouwbare vrij te gebruiken
-- foto's gevonden van de specifieke accommodaties (kleine boutique-resorts/privé-
-- verhuur), dus dit veld start leeg en is bewerkbaar zodra jullie zelf een foto hebben.
-- Uitvoeren via de SQL Editor.

alter table accommodations add column photo_url text;
