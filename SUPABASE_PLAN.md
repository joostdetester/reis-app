# SUPABASE_PLAN.md

## Doel

Vervang `localStorage` door Supabase zodat wijzigingen realtime op alle telefoons zichtbaar zijn.

## Aanbevolen datamodel

### trips

- id uuid primary key
- name text
- slug text unique
- start_date date
- end_date date
- access_token_hash text
- created_at timestamptz

### trip_days

- id uuid primary key
- trip_id uuid references trips
- travel_date date
- location text
- island text
- day_type text check in ('reisdag','verblijfsdag')
- morning_text text
- afternoon_text text
- evening_text text
- notes text
- sort_order int
- updated_at timestamptz

### accommodations

- id uuid primary key
- trip_id uuid references trips
- name text
- address text
- check_in timestamptz
- check_out timestamptz
- booking_reference text
- phone text
- maps_url text
- updated_at timestamptz

### trip_day_accommodations

- trip_day_id uuid references trip_days
- accommodation_id uuid references accommodations

### transport_items

- id uuid primary key
- trip_id uuid references trips
- trip_day_id uuid references trip_days
- type text
- carrier text
- booking_reference text
- origin text
- destination text
- departure_time timestamptz
- arrival_time timestamptz
- maps_url text
- status text
- updated_at timestamptz

### activities

- id uuid primary key
- trip_id uuid references trips
- trip_day_id uuid references trip_days
- title text
- day_part text check in ('ochtend','middag','avond')
- exact_time timestamptz null
- status text check in ('vast','optioneel','nog_te_boeken')
- category text
- address text
- maps_url text
- updated_at timestamptz

### destinations

- id uuid primary key
- trip_id uuid references trips
- name text
- summary text
- restaurants jsonb
- practical_tips jsonb
- bad_weather_alternatives jsonb

### practical_info

- id uuid primary key
- trip_id uuid references trips
- section text
- title text
- content text
- sort_order int

## Realtime

Activeer Supabase Realtime voor:

- trip_days
- accommodations
- transport_items
- activities
- practical_info

In de frontend:
- subscribe op wijzigingen per trip_id;
- update lokale state na INSERT/UPDATE/DELETE;
- toon kleine sync-status.

## Beveiliging

Gebruik nooit de Supabase service role key in de browser.

Voor een geheime-link-oplossing zijn twee routes mogelijk.

### Optie A — eenvoudig en snel

- Moeilijk te raden trip slug.
- Publieke read policies.
- Wijzigingen alleen via Edge Function.
- Edge Function valideert een edit token.
- Token staat in sessionStorage na openen van de geheime link.

### Optie B — veiliger

- Supabase Magic Link per gezinslid.
- Iedereen krijgt eigen account.
- Rechten via trip_members.
- Technisch netter en beter controleerbaar.

Gezien de wens "geheime link zonder wachtwoord" past optie A het best, maar optie B is veiliger.

## Migratie

1. Maak Supabase-project.
2. Maak tabellen en RLS.
3. Importeer `data.json`.
4. Vervang fetch van `data.json` door Supabase queries.
5. Vervang localStorage writes door UPDATE-calls.
6. Voeg Realtime subscriptions toe.
7. Voeg foutafhandeling en sync-status toe.
8. Test op twee telefoons tegelijk.

## Environment variables

Gebruik bijvoorbeeld:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TRIP_SLUG=
```

Commit nooit echte secrets.

## Eerste ontwikkelstap

Bouw eerst een kleine verticale slice:

- lees trip_days uit Supabase;
- toon Vandaag;
- bewerk één veld;
- sla op;
- controleer realtime update in tweede browser.

Pas daarna de rest migreren.
