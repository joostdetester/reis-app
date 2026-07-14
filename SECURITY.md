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
- Uitloggen kan via de knop naast "Gezinsreis" in de header (met een bevestigingsstap, zodat niemand per ongeluk de link kwijtraakt) — verwijdert de token uit `localStorage` op dat toestel (`clearEditToken`); daarna is óf de link met `?token=...` óf "Inloggen met Google" (zie hieronder) weer nodig voor bewerktoegang.
- Bij verlies of vermoeden van lekken: nieuwe token genereren, hash bijwerken via een `update trips set access_token_hash = ...` in de SQL Editor, nieuwe link versturen (en de `TRIP_EDIT_TOKEN`-secret hieronder meteen mee bijwerken, anders geeft "Inloggen met Google" nog de oude token terug).

## Inloggen met Google

Naast de geheime link kan een gezinslid ook inloggen met een vooraf afgesproken Google-account, zodat niemand de link zelf hoeft te bewaren. Dit is een bewuste, latere uitbreiding op het "geheime link, geen wachtwoord"-model (zie "Wat hier bewust niet gebeurt" hieronder voor de oorspronkelijke afweging) — expliciet gevraagd omdat gezinsleden bang waren de link kwijt te raken na uitloggen.

1. De knop "🔐 Inloggen met Google" in de header vraagt via Google Identity Services in één keer twee scopes op: `email` (geverifieerd e-mailadres) en de Google Photos Picker-scope (zodat dezelfde login ook meteen voor de Foto's-pagina werkt, zonder een tweede keer in te loggen).
2. Het opgehaalde Google-toegangstoken gaat naar de Edge Function `login-with-google` (`supabase/functions/login-with-google/index.ts`), die het **server-side** verifieert bij Google's `userinfo`-endpoint (nooit clientside vertrouwd) en checkt of `email_verified === true` en het e-mailadres voorkomt in de `ALLOWED_GOOGLE_EMAILS`-secret (kommagescheiden lijst, alleen in het Supabase-dashboard, geen code).
3. Bij een toegestaan account geeft de functie de bestaande, echte edit-token terug (uit de `TRIP_EDIT_TOKEN`-secret — dezelfde plaintext-token als in de geheime link, dus geen los toegangssysteem met eigen rechten). De frontend slaat 'm op dezelfde manier op als bij de geheime link (`setEditToken`, `localStorage`).
4. Een niet-toegestaan of niet-geverifieerd Google-account krijgt een duidelijke afwijzing (401/403) en géén token.

Dit voegt geen nieuw schrijfpad toe: `login-with-google` schrijft niets, het geeft alleen (na verificatie) dezelfde token terug die `save-edit` al controleert. De beveiliging van "Schrijven" hierboven verandert dus niet.

## Wat hier bewust niet gebeurt

- Geen apart account-/rollensysteem per gezinslid — "Inloggen met Google" is een tweede *manier* om aan dezelfde edit-token te komen, geen nieuw autorisatiemodel met eigen rechten per gebruiker. (De oorspronkelijke afweging tegen optie B — een volwaardig accountsysteem met magic links — staat nog steeds: dat zou beheerlast toevoegen zonder dat dit gebruiksscenario daar behoefte aan heeft. Deze uitbreiding is bewust minimaal gehouden: alleen e-mailverificatie + allowlist, geen eigen sessies/rollen.)
- Geen service-role key in de frontend, in `VITE_*`-env-vars, of in de git-historie — alleen als Edge Function-secret in het Supabase-dashboard.
- Geen plaintext edit-token in de repo — alleen de hash (voor `save-edit`) en, sinds "Inloggen met Google", ook als Edge Function-secret `TRIP_EDIT_TOKEN` (nooit in code of `.env`-bestanden die naar de client gaan).
