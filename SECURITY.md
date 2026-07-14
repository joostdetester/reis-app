# Beveiligingskeuzes

Deze app gebruikt een "geheime link, geen wachtwoord"-model (optie A uit `SUPABASE_PLAN.md`), omdat dat expliciet gevraagd is in `CLAUDE.md`. Hieronder staat wat dat concreet betekent.

## Lezen

Alle tabellen hebben een RLS-policy die `select` toestaat voor de anon-rol, zonder tokencheck. Er is precies één trip in gebruik en de inhoud is niet gevoelig (een vakantieschema). De geheimhouding zit in de link zelf: de `trip_slug` is een moeilijk te raden, willekeurige string (`VITE_TRIP_SLUG`), niet in cryptografische leesgating per request. Dit is een bewuste, gedocumenteerde afweging — geen achtergebleven gat.

`trips.access_token_hash` wordt in de frontend-hooks nooit geselecteerd, ook al staat de kolom achter een publieke leespolicy.

Een link zonder `?token=...` is dus de "alleen-lezen"-link: geschikt om te delen met mensen die het reisplan mogen zien maar niet mogen wijzigen. De UI toont dan nergens een "Bewerk"-knop (zie `src/components/EditButton.tsx`, gebaseerd op `hasEditAccess()` in `src/lib/tripAccess.ts`) en laat een "Alleen-lezen"-badge in de header zien. Dit is puur een UI-gemak — de eigenlijke afdwinging gebeurt hieronder bij "Schrijven", dus zelfs zonder deze UI-check zou een schrijfpoging zonder geldige token al falen.

## Schrijven

De anon-rol heeft geen `insert`/`update`/`delete`-rechten op enige tabel. Alle wijzigingen lopen via de Supabase Edge Function `save-edit` (`supabase/functions/save-edit/index.ts`):

1. De client stuurt `{ slug, token, table, id, patch }`.
2. De functie zoekt de trip op via `slug`, hasht de meegestuurde `token` (SHA-256) en vergelijkt die met `trips.access_token_hash`.
3. Bij een geldige token voert de functie de update uit met de service-role key — die alleen in de Edge Function-omgeving leeft en nooit in frontend-code, `.env`-bestanden die naar de client gaan, of de build-output terechtkomt.
4. `table` en de velden in `patch` worden gevalideerd tegen een expliciete allowlist per tabel (`EDITABLE_COLUMNS`), zodat er nooit buiten de bedoelde kolommen (of tabellen als `trips` zelf) geschreven kan worden.

Twee Edge Functions wijken hiervan af en schrijven zónder edit-tokencheck, met opzet:

- **`flight-status`** werkt `transport_items.departure_time`/`arrival_time` bij op basis van
  een externe, geverifieerde vluchtstatus-API (AeroDataBox) — dit is systeemsync van
  publieke vluchtdata, geen wijziging door een gezinslid, dus geen tokencheck nodig. Wel
  valideert de functie `transportItemId` en past alleen díe rij aan.
- **`upload-day-photo`** valideert wél het edit-token (zelfde patroon als `save-edit`) vóór
  het uploaden naar de publieke Storage-bucket `day-photos` en het aanmaken van een
  `day_photos`-rij; alleen het schrijfpad (Storage + insert i.p.v. update) wijkt af omdat
  `save-edit` alleen bestaande rijen kan bijwerken.

## De edit-token

- Wordt gegenereerd als willekeurige string; alleen de SHA-256-hash staat in de database (`supabase/seed_trip.sql`).
- Gezinsleden krijgen de link met `?token=...` erin.
- Bij eerste bezoek leest `src/lib/tripAccess.ts` de token uit de URL, bewaart 'm in `localStorage` (bewust, niet `sessionStorage`: blijft zo staan na het sluiten van de app/tab, belangrijk voor "Zet op beginscherm" op mobiel) en verwijdert 'm meteen uit de zichtbare URL (`history.replaceState`) zodat hij niet in browserhistorie/referrers blijft staan.
- Uitloggen kan via de knop naast "Gezinsreis" in de header — verwijdert de token uit `localStorage` op dat toestel (`clearEditToken`); de link met `?token=...` moet dan opnieuw geopend worden voor bewerktoegang.
- Bij verlies of vermoeden van lekken: nieuwe token genereren, hash bijwerken via een `update trips set access_token_hash = ...` in de SQL Editor, nieuwe link versturen.

## Wat hier bewust niet gebeurt

- Geen aparte accounts/magic links per gezinslid (optie B) — sluit niet aan bij de eis "geheime link zonder apart wachtwoord" en voegt beheerlast toe zonder dat daar in dit gebruiksscenario behoefte aan is.
- Geen service-role key in de frontend, in `VITE_*`-env-vars, of in de git-historie — alleen als Edge Function-secret in het Supabase-dashboard.
- Geen plaintext edit-token in de repo — alleen de hash.
