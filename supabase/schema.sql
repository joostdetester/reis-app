-- Filipijnen 2026 reisapp — Supabase schema + RLS
-- Uitvoeren via de Supabase SQL Editor (dashboard) op project oolvgoquzoiysnmhnjkp.
-- Zie SECURITY.md voor de onderbouwing van de beveiligingskeuzes hieronder.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  start_date date not null,
  end_date date not null,
  access_token_hash text not null,
  created_at timestamptz not null default now()
);

create table trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  travel_date date not null,
  location text not null,
  island text not null,
  day_type text not null check (day_type in ('reisdag','verblijfsdag')),
  morning_text text,
  afternoon_text text,
  evening_text text,
  notes text,
  sort_order int not null,
  updated_at timestamptz not null default now()
);

create table accommodations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  address text,
  check_in timestamptz,
  check_out timestamptz,
  booking_reference text,
  phone text,
  maps_url text,
  photo_url text,
  updated_at timestamptz not null default now()
);

create table trip_day_accommodations (
  trip_id uuid not null references trips(id) on delete cascade,
  trip_day_id uuid not null references trip_days(id) on delete cascade,
  accommodation_id uuid not null references accommodations(id) on delete cascade,
  primary key (trip_day_id, accommodation_id)
);

create table transport_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  trip_day_id uuid not null references trip_days(id) on delete cascade,
  type text not null,
  carrier text,
  booking_reference text,
  origin text,
  destination text,
  departure_time timestamptz,
  arrival_time timestamptz,
  departure_terminal text,
  departure_gate text,
  arrival_terminal text,
  delay_minutes int,
  maps_url text,
  status text,
  updated_at timestamptz not null default now()
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  trip_day_id uuid not null references trip_days(id) on delete cascade,
  title text not null,
  day_part text not null check (day_part in ('ochtend','middag','avond')),
  exact_time timestamptz,
  status text not null check (status in ('vast','optioneel','nog_te_boeken')),
  category text,
  address text,
  maps_url text,
  updated_at timestamptz not null default now()
);

create table destinations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  summary text,
  restaurants jsonb,
  practical_tips jsonb,
  bad_weather_alternatives jsonb,
  dive_shops jsonb
);

create table practical_info (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  section text not null,
  title text not null,
  content text not null,
  sort_order int not null
);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Lezen: publiek open voor de anon-rol. Er is precies één trip, de inhoud is
-- niet gevoelig (vakantieplanning), en de geheimhouding zit in de link zelf
-- (moeilijk te raden trip_slug), niet in cryptografische leesgating.
--
-- Schrijven: de anon-rol krijgt GEEN insert/update/delete-rechten. Alle
-- wijzigingen lopen via de Edge Function `save-edit`, die de edit-token
-- valideert en met de service-role key (alleen serverside) de update uitvoert.
-- ---------------------------------------------------------------------------

alter table trips enable row level security;
alter table trip_days enable row level security;
alter table accommodations enable row level security;
alter table trip_day_accommodations enable row level security;
alter table transport_items enable row level security;
alter table activities enable row level security;
alter table destinations enable row level security;
alter table practical_info enable row level security;

-- Let op: 'access_token_hash' mag nooit aan de client worden teruggegeven.
-- Deze policy geeft leestoegang op trips, maar de kolom wordt in de frontend
-- nooit geselecteerd (zie src/hooks) — selecteer daar alleen de benodigde kolommen.
create policy "trips zijn publiek leesbaar" on trips
  for select using (true);

create policy "trip_days zijn publiek leesbaar" on trip_days
  for select using (true);

create policy "accommodations zijn publiek leesbaar" on accommodations
  for select using (true);

create policy "trip_day_accommodations zijn publiek leesbaar" on trip_day_accommodations
  for select using (true);

create policy "transport_items zijn publiek leesbaar" on transport_items
  for select using (true);

create policy "activities zijn publiek leesbaar" on activities
  for select using (true);

create policy "destinations zijn publiek leesbaar" on destinations
  for select using (true);

create policy "practical_info is publiek leesbaar" on practical_info
  for select using (true);

-- Geen insert/update/delete policies voor anon -> RLS blokkeert die standaard.
-- Schrijven gebeurt uitsluitend via de Edge Function met de service-role key,
-- die RLS omzeilt (service_role bypassing is standaard Supabase-gedrag).

-- ---------------------------------------------------------------------------
-- Realtime
-- Zet in het dashboard (Database > Replication) realtime aan voor:
-- trip_days, accommodations, transport_items, activities, practical_info
-- ---------------------------------------------------------------------------
