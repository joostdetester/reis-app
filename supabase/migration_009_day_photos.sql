-- Migratie: tabel voor per-dag foto's (geïmporteerd via de Google Photos Picker API)
-- en de bijbehorende Storage-bucket. Zelfde beveiligingspatroon als de rest: publiek
-- leesbaar, schrijven alleen via een Edge Function (upload-day-photo) met de
-- service-role key, dus geen edit-token-validatie op databaseniveau nodig.
-- Uitvoeren via de SQL Editor.

create table day_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  trip_day_id uuid not null references trip_days(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table day_photos enable row level security;

create policy "day_photos zijn publiek leesbaar" on day_photos
  for select using (true);

-- Publieke bucket: uploads gebeuren via de Edge Function (service-role, dus RLS/policies
-- worden daar toch omzeild), leesverkeer mag rechtstreeks via de publieke object-URL.
insert into storage.buckets (id, name, public)
values ('day-photos', 'day-photos', true)
on conflict (id) do nothing;
