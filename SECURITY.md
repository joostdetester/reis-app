# Beveiligingskeuzes

Deze app gebruikt een "geheime link, geen wachtwoord"-model (optie A uit `SUPABASE_PLAN.md`), omdat dat expliciet gevraagd is in `CLAUDE.md`. Hieronder staat wat dat concreet betekent.

## Lezen

Alle tabellen hebben een RLS-policy die `select` toestaat voor de anon-rol, zonder tokencheck. Er is precies één trip in gebruik en de inhoud is niet gevoelig (een vakantieschema). De geheimhouding zit in de link zelf: de `trip_slug` is een moeilijk te raden, willekeurige string (`VITE_TRIP_SLUG`), niet in cryptografische leesgating per request. Dit is een bewuste, gedocumenteerde afweging — geen achtergebleven gat.

`trips.access_token_hash` wordt in de frontend-hooks nooit geselecteerd, ook al staat de kolom achter een publieke leespolicy.

## Schrijven

De anon-rol heeft geen `insert`/`update`/`delete`-rechten op enige tabel. Alle wijzigingen lopen via de Supabase Edge Function `save-edit` (`supabase/functions/save-edit/index.ts`):

1. De client stuurt `{ slug, token, table, id, patch }`.
2. De functie zoekt de trip op via `slug`, hasht de meegestuurde `token` (SHA-256) en vergelijkt die met `trips.access_token_hash`.
3. Bij een geldige token voert de functie de update uit met de service-role key — die alleen in de Edge Function-omgeving leeft en nooit in frontend-code, `.env`-bestanden die naar de client gaan, of de build-output terechtkomt.
4. `table` en de velden in `patch` worden gevalideerd tegen een expliciete allowlist per tabel (`EDITABLE_COLUMNS`), zodat er nooit buiten de bedoelde kolommen (of tabellen als `trips` zelf) geschreven kan worden.

## De edit-token

- Wordt gegenereerd als willekeurige string; alleen de SHA-256-hash staat in de database (`supabase/seed_trip.sql`).
- Gezinsleden krijgen de link met `?token=...` erin.
- Bij eerste bezoek leest `src/lib/tripAccess.ts` de token uit de URL, bewaart 'm in `sessionStorage` en verwijdert 'm meteen uit de zichtbare URL (`history.replaceState`) zodat hij niet in browserhistorie/referrers blijft staan.
- Bij verlies of vermoeden van lekken: nieuwe token genereren, hash bijwerken via een `update trips set access_token_hash = ...` in de SQL Editor, nieuwe link versturen.

## Wat hier bewust niet gebeurt

- Geen aparte accounts/magic links per gezinslid (optie B) — sluit niet aan bij de eis "geheime link zonder apart wachtwoord" en voegt beheerlast toe zonder dat daar in dit gebruiksscenario behoefte aan is.
- Geen service-role key in de frontend, in `VITE_*`-env-vars, of in de git-historie — alleen als Edge Function-secret in het Supabase-dashboard.
- Geen plaintext edit-token in de repo — alleen de hash.
