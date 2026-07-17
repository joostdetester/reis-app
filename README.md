# Filipijnen Reisapp

Mobiele reisapp voor de gezinsreis naar de Filipijnen van 23 juli t/m 13 augustus 2026.

React + TypeScript + Vite, met Supabase (Postgres + Realtime) als gedeelde databron: wijzigingen van één gezinslid zijn direct zichtbaar op alle andere telefoons.

## Openen in VS Code

```powershell
cd "C:\Users\joost\Documents\Test automation\Reis app"
code .
```

## Lokaal draaien

```powershell
npm install
npm run dev
```

Zet eerst `.env.local` klaar (op basis van `.env.example`) met je Supabase-project-URL, anon key en trip-slug.

## Belangrijke bestanden

- `src/` — de React-app (pages, components, hooks, lib, types, utils)
- `index.html`, `vite.config.ts` — Vite-configuratie
- `data.json` — oorspronkelijke reisdata, gebruikt door het eenmalige migratiescript
- `supabase/schema.sql` — tabellen + Row Level Security
- `supabase/functions/save-edit/` — de Edge Function waar alle schrijfacties doorheen lopen
- `supabase/functions/verify-edit-token/` — read-only Edge Function die bepaalt of de UI Bewerk-knoppen mag tonen (zie SECURITY.md)
- `supabase/seed_from_data_json.mjs` — eenmalig migratiescript van `data.json` naar Supabase
- `supabase/seed_practical_info.mjs` — eenmalig seed-script voor de praktische-informatiepagina
- `SECURITY.md` — onderbouwing van de beveiligingskeuzes (geheime link, edit-token, RLS)
- `CLAUDE.md` — functionele eisen en projectinstructies
- `PROJECT_CONTEXT.md` — achtergrond en gebruiksdoel
- `SUPABASE_PLAN.md` — het oorspronkelijke migratievoorstel

## Supabase opzetten (eenmalig, nieuw project)

1. Maak een Supabase-project.
2. Draai `supabase/schema.sql` in de SQL Editor.
3. Draai `supabase/seed_trip.sql` (pas slug/token-hash aan als je een nieuwe reis opzet).
4. Zet Realtime aan onder **Database → Publications** voor alle tabellen.
5. Deploy `supabase/functions/save-edit/index.ts` onder **Edge Functions**.
6. Vul `supabase/.env.seed` (op basis van `.env.seed.example`) met de service-role key en draai:
   ```powershell
   node --env-file=supabase/.env.seed supabase/seed_from_data_json.mjs
   node --env-file=supabase/.env.seed supabase/seed_practical_info.mjs
   ```

Zie `SECURITY.md` voor waarom schrijven alleen via de Edge Function loopt en lezen publiek is.

## Testen

```powershell
npm run build   # type-check + productiebuild
npx vitest run
```

Playwright end-to-end tests staan niet in deze repo, maar in het aparte reis-app-taf
testautomatiseringsproject (Cucumber/BDD/POM/Allure).

### data-testid's

Interactieve en betekenisvolle elementen hebben een `data-testid` voor stabiele,
taal-onafhankelijke selectors in end-to-end tests (los van CSS-classes of Nederlandse
teksten, die kunnen wijzigen). Conventie: kebab-case, hiërarchisch opgebouwd van
algemeen naar specifiek, met het domein-ID erin waar een lijst-item wordt geïdentificeerd,
bv. `day-card-{dayId}`, `field-{table}-{field}-{id}`, `bottom-nav-trip`.

Herbruikbare componenten (`EditButton`, `EditSheet`, `FieldRow`) nemen een `testId`-prop
aan (of leiden die af uit `table`/`field`/`id`) zodat elke plek waar ze gebruikt worden een
eigen unieke testid krijgt, ook als er meerdere op dezelfde pagina staan.

## Geheime link

De app is bedoeld voor toegang via een link met een edit-token (`?token=...`), niet via een apart wachtwoord. Zie `SECURITY.md`.

## Versienummer

`package.json` bevat het huidige versienummer (semver). Bij elke `npm run build`
schrijft `scripts/write-version.mjs` dat versienummer, samen met de git-commit
en het build-tijdstip, naar `public/version.json` — een gegenereerd bestand
(niet in git), dat na deploy publiek opvraagbaar is via `{BASE_URL}/version.json`.
Het reis-app-taf testframework leest dit uit om te loggen tegen welke app-versie
een testrun heeft gedraaid.

Bump de versie handmatig zodra je een wijziging shipt die het waard is om in
testrapportages te onderscheiden, vóór de commit die de wijziging bevat:

```powershell
npm version patch --no-git-tag-version   # of minor/major, zie semver.org
```

Dit is bewust een menselijke stap, geen automatische bump per commit — bij een
gezinsapp met incidentele wijzigingen zou dat alleen ruis toevoegen.
