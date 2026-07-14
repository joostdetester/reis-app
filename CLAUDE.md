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

Extra menu (in de header):

- Tijdlijn
- Bestemmingen
- Kalender
- Reisroute (kaart met de vluchtroute)
- Foto's
- Praktische informatie

Zoeken zit ingebouwd in de tijdlijn op het Reis-tabblad (geen aparte pagina).

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
- vluchtmaatschappij en type vlucht, met een link naar de route op Google Maps;
- vluchtnummer;
- vertrek- en aankomstlocatie, met de locatienaam zelf als link naar Google Maps;
- vertrek- en aankomsttijd, bewerkbaar; bij wijziging een waarschuwing tonen dat de
  vluchttijden zijn aangepast;
- vluchtduur;
- vertrekhal, gate en aankomstterminal: automatisch overgenomen vanaf 2 uur voor
  vertrek resp. aankomst (daarvoor "Nog niet beschikbaar"), en bewerkbaar zodra bekend;
- vluchtstatus: actuele status (op tijd/vertraagd/geannuleerd/geland/...), automatisch
  opgehaald vanaf 48 uur voor vertrek tot 24 uur na aankomst. Het vluchtnummer is altijd
  (dus ook ver vóór het opgehaald-venster, of met de vluchtstatus-API uitgezet) een link
  naar de Flightradar24-pagina van die vlucht, zodat al doorgeklikt kan worden naar meer
  informatie voordat onze eigen status bekend is. Bij een vlucht met overstap (meerdere
  vluchtnummers) krijgt elk vluchtnummer zijn eigen link.

Vanaf 24 uur voor vertrek een afteller tonen.

De vluchtstatus-API kan met een schakelaar (alleen zichtbaar met edit-token) helemaal
worden uitgezet, om binnen de quota van het gratis API-abonnement te blijven.

## Zoeken

Ingebouwd in de tijdlijn op het Reis-tabblad: typen filtert de dagblokken direct tot
alleen de treffers, en klapt die blokken meteen allemaal open.

## Foto's

Aparte pagina (koppeling in de header). Alleen foto's, geen video's (uploaden van
video's werkt nog niet). Per dag van de reis (kopje met dag + locatie) een fotogrid;
klikken op een foto toont 'm vergroot, met swipe + pijlknoppen om chronologisch door
alle foto's van de hele reis te bladeren (over dag-grenzen heen) en dag + locatie
bovenaan die meeverandert. In de vergrote weergave kan met twee vingers op de foto
worden ingezoomd (pinch-to-zoom) en, eenmaal ingezoomd, met één vinger gesleept om
verder in te scrollen; swipen om naar de vorige/volgende foto te gaan werkt alleen
zolang er niet is ingezoomd.

Foto's toevoegen kan alleen met edit-token, via "Foto's kiezen uit Google Photos" — dat
opent Google's eigen kiesscherm (Google Photos Picker API) waarin een gezinslid zelf
foto's aanwijst uit de eigen Google Photos (inclusief wat anderen in een gedeeld album
hebben gezet). Gekozen foto's worden verkleind gedownload (altijd als web-veilige JPEG,
ook als het origineel dat niet is, bv. HEIC vanaf een iPhone) en opgeslagen in een eigen
Supabase Storage-bucket — geen losse embed van Google Photos zelf (bestaat niet
betrouwbaar/officieel voor gedeelde albums). Eenmaal ingelogd bij Google voor één dag
geldt dat voor de rest van het paginabezoek voor alle dagen; andere dagen tonen dan
direct "Open keuzescherm" i.p.v. opnieuw de Google-inlogknop. Elke foto heeft een eigen
verwijderknop (met bevestigingsstap).

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

Bewerktoegang krijgen kan op twee manieren: de geheime link met `?token=...` openen, of in
de header op "Inloggen met Google" klikken en inloggen met een vooraf afgesproken
gezinsaccount (server-side geverifieerd tegen een vaste lijst toegestane e-mailadressen).
Beide geven dezelfde edit-token; zie `SECURITY.md` voor de technische details. Uitloggen
(knop naast "Gezinsreis" in de header) vraagt eerst bevestiging, met een toelichting dat
daarna opnieuw de link of "Inloggen met Google" nodig is.

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
