-- Migratie: photos_album_url op trips (link naar één gedeeld Google Photos-album voor de
-- hele reis, waar alle gezinsleden zelf foto's/video's aan toevoegen). updated_at erbij zodat
-- de save-edit Edge Function (die dat veld altijd zet) ook op trips kan schrijven.
-- Uitvoeren via de SQL Editor.

alter table trips add column photos_album_url text;
alter table trips add column updated_at timestamptz not null default now();
