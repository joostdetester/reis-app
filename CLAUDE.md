# CLAUDE.md

## Projectdoel

Bouw en onderhoud een mobiele reiswebapp voor een gezinsreis naar de Filipijnen van 23 juli 2026 t/m 13 augustus 2026.

De app wordt gebruikt door het hele gezin. Iedereen mag wijzigingen doen. Wijzigingen moeten uiteindelijk via Supabase direct op alle apparaten zichtbaar zijn.

Werk in het Nederlands.

## Belangrijkste uitgangspunten

- Mobile-first.
- Praktische én tropische uitstraling.
- Snelle navigatie.
- Eén gezamenlijke actuele versie.
- Geen versiehistorie zichtbaar in de UI.
- Wijzigingen worden pas opgeslagen na bevestiging.
- Geen kostenregistratie.
- Geen documenten of tickets opslaan; alleen boekingsnummers.
- Geen notificaties.
- Geen offline vereiste.
- Website alleen via een geheime link, zonder apart wachtwoord.
- Alle gezinsleden mogen wijzigen.
- Activiteiten blijven binnen de dagplanning; geen aparte activiteitenpagina.
- Vrije plekken tonen als "Nog in te vullen".
- Bij "Nog in te vullen" automatisch drie suggesties tonen.
- Suggesties baseren op locatie, beschikbare tijd en type activiteit.
- Activiteitstypen: natuur, avontuur, cultuur, eten en ontspanning.
- Suggesties kunnen met één knop worden toegevoegd.
- Na toevoegen eerst tijd of dagdeel laten kiezen.
- Bij overlap alleen waarschuwen, niet blokkeren.

## Navigatie

Vaste mobiele navigatie onderaan:

1. Vandaag
2. Reis
3. Hotels
4. Vluchten

Extra menu:

- Praktische informatie
- Zoeken
- Kalender
- Kaart

## Startpagina

Tijdens de reis:

- Toon vandaag en morgen.
- Gebruik een verticale tijdlijn.
- Toon hotelnaam, adres en in-/uitchecktijd.
- Toon eerstvolgende verplaatsing met bestemming, vertrektijd en vervoermiddel.
- Toon actieknop voor vervoer, activiteiten en in-/uitchecken.
- Toon actueel weer en voorspelling.
- Waarschuw bij veel regen of slecht reisweer.

Voor vertrek:

- Toon afteller tot vertrek.

## Dagweergave

Per dag tonen:

- datum;
- locatie;
- eiland;
- label reisdag of verblijfsdag;
- hotel;
- vervoer;
- vervoerder;
- boekingsnummer;
- vertrek- en aankomstpunt;
- vertrek- en aankomsttijd;
- ochtend;
- middag;
- avond;
- gezamenlijke notitie;
- status per activiteit: vast, optioneel of nog te boeken;
- één kaart met alle locaties van die dag;
- route, reistijd en afstand;
- Google Maps-knoppen.

Onderdelen zonder exacte tijd indelen bij ochtend, middag of avond.

## Reisoverzicht

Ondersteun drie weergaven:

- tijdlijn;
- per bestemming;
- kalender.

In tijdlijn:

- vandaag en morgen volledig open;
- overige dagen ingeklapt;
- navigatie via horizontaal swipen en datumkiezer.

## Hotels

Aparte pagina met:

- hotelnaam;
- adres;
- verblijfdata.

Geen documenten tonen.

## Vluchten

Aparte pagina, uitsluitend vluchten (ander vervoer zoals boot, scooter, taxi of ferry
staat alleen in de dagweergave, niet op deze pagina). Per vlucht tonen:

- datum;
- traject;
- vertrek- en aankomsttijd, bewerkbaar; bij wijziging een waarschuwing tonen dat de
  vluchttijden zijn aangepast;
- vervoerder;
- vluchtnummer;
- vertrek- en aankomstlocatie;
- vertrekhal, gate en aankomstterminal, bewerkbaar zodra bekend;
- routeknop.

Vanaf 24 uur voor vertrek een afteller tonen.

## Zoeken en filteren

- Zoeken in alle reisgegevens.
- Filteren op type onderdeel:
  - hotel;
  - vervoer;
  - activiteit.

## Praktische informatie

Eén pagina met:

- noodnummers;
- verzekeringsgegevens;
- belangrijke adressen;
- lokale tips over geld;
- vervoer;
- bereikbaarheid.

## Bestemmingsinformatie

Per bestemming tonen:

- verblijfdata;
- hotel;
- activiteiten;
- restaurants;
- praktische tips;
- alternatieven voor slecht weer.

## Bewerken

- Bij elk bestaand onderdeel een knop "Bewerken".
- Bestaande onderdelen aanpassen.
- Geen nieuwe losse hoofdonderdelen toevoegen via algemene CRUD.
- Bij opslaan altijd bevestiging vragen.
- Alleen actuele informatie tonen.
- Wijzigingen moeten via Supabase realtime synchroniseren.

## Techniek

Voorkeur voor:

- React;
- TypeScript;
- Vite;
- Supabase;
- mobile-first CSS of Tailwind;
- Supabase Realtime;
- eventueel Mapbox of Google Maps-links;
- weer via een publieke weather API.

Houd de code eenvoudig, goed leesbaar en uitbreidbaar.

## Supabase-richtlijnen

Gebruik minimaal deze entiteiten:

- trips
- trip_days
- accommodations
- transport_items
- activities
- day_notes
- destinations
- practical_info

Gebruik één trip-record voor deze reis.

Omdat toegang via een geheime link gewenst is, kan de eerste versie werken met een publieke trip_slug en een moeilijk te raden token. Gebruik geen service role key in de frontend.

Beveilig wijzigingen via Row Level Security. Een werkbare eerste oplossing is:

- read access op basis van trip_slug + access_token;
- write access via een Supabase Edge Function of een aparte edit-token flow.

Documenteer beveiligingskeuzes duidelijk.

## Testen

Voeg waar zinvol toe:

- unit tests voor datumlogica;
- tests voor vandaag/morgen;
- tests voor countdowns;
- tests voor filtering;
- tests voor bewerken en bevestiging;
- Playwright end-to-end tests voor hoofdnavigatie.

## Niet doen

- Geen verborgen mockdata laten staan zonder duidelijke markering.
- Geen gevoelige Supabase keys committen.
- Geen directe service role key in clientcode.
- Geen Engelstalige UI tenzij technisch noodzakelijk.
- Geen onnodig complexe architectuur.
