# Filipijnen Reisapp

Mobiele reisapp voor de gezinsreis naar de Filipijnen van 23 juli 2026 t/m 13 augustus 2026.

## Openen in VS Code

Pak deze map uit naar:

```text
C:\Users\joost\Documents\Test automation\Reis app
```

Open daarna PowerShell:

```powershell
cd "C:\Users\joost\Documents\Test automation\Reis app"
code .
```

## Huidige versie starten

Deze versie bestaat nog uit statische HTML, CSS en JavaScript.

Start lokaal met:

```powershell
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## Belangrijke bestanden

- `index.html` — ingang van de app
- `app.js` — huidige logica
- `styles.css` — styling
- `data.json` — reisdata
- `CLAUDE.md` — instructies en functionele eisen voor Claude
- `PROJECT_CONTEXT.md` — achtergrond en gebruiksdoel
- `SUPABASE_PLAN.md` — voorstel voor Supabase
- `README.md` — installatie en gebruik

## GitHub initialiseren

```powershell
git init
git add .
git commit -m "Initial Filipijnen reisapp"
git branch -M main
git remote add origin JOUW_GITHUB_REPOSITORY_URL
git push -u origin main
```

## Aanbevolen vervolgstap

Migreer naar:

- React
- TypeScript
- Vite
- Supabase

Laat Claude eerst `CLAUDE.md`, `PROJECT_CONTEXT.md` en `SUPABASE_PLAN.md` lezen.

Een goede eerste prompt in VS Code:

```text
Lees eerst CLAUDE.md, PROJECT_CONTEXT.md en SUPABASE_PLAN.md volledig.
Analyseer daarna de huidige code.
Maak een concreet migratieplan van deze statische app naar React + TypeScript + Vite + Supabase.
Begin nog niet met grote wijzigingen totdat je het plan hebt gegeven.
```

## Huidige beperking

Wijzigingen worden nog lokaal opgeslagen in `localStorage`.

Voor gedeeld gebruik door het gezin moet dit worden vervangen door Supabase.
