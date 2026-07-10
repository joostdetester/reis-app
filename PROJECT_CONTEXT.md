# PROJECT_CONTEXT.md

## Achtergrond

Deze applicatie is bedoeld voor een gezinsreis naar de Filipijnen.

Reisperiode:
- Vertrek: 23 juli 2026
- Terugkomst: 13 augustus 2026

Globale route:
- Amsterdam
- Manila
- Puerto Princesa
- El Nido
- Cebu City
- Moalboal
- Siargao
- Manila
- Amsterdam

De app moet tijdens de reis op mobiele telefoons worden gebruikt.

## Gebruikers

Het hele gezin gebruikt de website.

Iedereen mag:
- de website bekijken;
- bestaande informatie wijzigen.

Alle wijzigingen moeten uiteindelijk direct zichtbaar zijn op alle apparaten.

## Belangrijkste gebruiksscenario's

1. In de ochtend openen en direct zien wat vandaag en morgen gepland staat.
2. Snel hotel, vlucht, transfer of activiteit terugvinden.
3. Wijziging direct op de pagina doen.
4. Reisschema bekijken als tijdlijn, kalender of per bestemming.
5. Google Maps openen voor hotels, activiteiten en routes.
6. Boekingsnummer terugvinden zonder documenten te hoeven openen.
7. Vrije tijd herkennen als "Nog in te vullen".
8. Suggesties voor vrije tijd bekijken en toevoegen.
9. Weer en waarschuwingen bekijken.
10. Praktische informatie en noodnummers terugvinden.

## Reisinformatie uit het oorspronkelijke schema

De basisdata staat in `data.json`.

Controleer bij migratie naar Supabase:
- vluchtnummers;
- tijden;
- hotelnamen;
- transportstatus;
- onderdelen met "Nog regelen";
- inconsistenties in locatie/eiland;
- exacte adressen en check-in/check-outtijden.

## Bekende open punten

Nog aan te vullen:
- exacte hoteladressen;
- telefoonnummers;
- boekingsnummers waar deze ontbreken;
- vertrek- en aankomstlocaties;
- check-in- en check-outtijden;
- verzekeringsgegevens;
- noodcontacten;
- live weather provider;
- definitieve kaartintegratie;
- beveiligingsmodel voor gedeeld wijzigen.
