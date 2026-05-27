# Surron Lager — Publicera på Render.com (gratis)

## Vad du får

- En webb-URL i stil med `https://surron-lager.onrender.com`
- Tillgänglig från vilken dator som helst, var som helst
- Delad PostgreSQL-databas, 1 GB gratis (utgår aldrig)
- Inget kreditkort krävs

## Begränsningar med gratisnivån

- **Sover efter 15 min inaktivitet** — första anropet efter inaktivitet tar 30-60 sek
- **750 timmar/månad** — räcker för en alltid igång-tjänst
- För skarp drift utan vila: uppgradera till $7/mån

## Deployment-instruktioner

### Steg 1: Skapa GitHub-konto och nytt repo (5 min)

1. Gå till https://github.com och skapa ett gratis konto (om du inte har ett)
2. Klicka på **+** uppe till höger → **New repository**
3. Namn: `surron-lager`
4. Välj **Private** om du vill (eller Public)
5. Klicka **Create repository**

### Steg 2: Ladda upp koden

**Alternativ A: Via GitHubs webbgränssnitt (enklast, ingen Git-kunskap krävs)**

1. På din nya repo-sida klicka **"uploading an existing file"** (länken i mitten)
2. Dra **alla filer från denna mapp** (utom `node_modules/`) till sidan
3. Skriv "Initial commit" som beskrivning
4. Klicka **Commit changes**

**Alternativ B: Via Git (om du har det installerat)**

```bash
cd surron-render
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DITT-ANVÄNDARNAMN/surron-lager.git
git push -u origin main
```

### Steg 3: Skapa konto på Render (2 min)

1. Gå till https://render.com och klicka **Get Started**
2. Logga in med ditt GitHub-konto
3. Inget kreditkort behövs

### Steg 4: Deploya med Blueprint (1 klick)

1. I Render-dashboarden klicka **New +** → **Blueprint**
2. Välj GitHub-repot `surron-lager`
3. Render läser `render.yaml` automatiskt — den skapar både webbtjänst OCH databas
4. Klicka **Apply** / **Create Resources**
5. Vänta 2-3 minuter för bygget

### Steg 5: Klart!

När bygget är klart hittar du din URL i Render-dashboarden, t.ex.:
**https://surron-lager.onrender.com**

Skicka URL:en till vem som helst som ska använda appen.

## Uppdatera appen senare

När du ändrar i koden:

1. Pusha till GitHub (via webbgränssnittet eller `git push`)
2. Render bygger om och deployar automatiskt på ca 1-2 minuter

## Säkerhet (viktigt!)

Appen har **ingen inloggning** som standard — vem som helst med URL:en kan se och ändra lagret. Alternativ:

1. **Håll URL:en hemlig** (Render-URL:er är svåra att gissa)
2. **Lägg till inloggning** — säg till om du vill ha hjälp med detta

## Backup

Render säkerhetskopierar databasen automatiskt. Du kan också exportera CSV från appen via knappen "Exportera CSV".

## Felsökning

**"Application failed to respond"** — Servern sover. Vänta 30-60 sek och ladda om sidan.

**"DATABASE_URL not set"** — Databasen är inte ansluten till tjänsten. Gå till Render-dashboarden → din tjänst → Environment → kontrollera att DATABASE_URL finns.

**Sidan laddar men ingen data syns** — Öppna webbläsarens konsol (F12) och kolla efter fel. Sannolikt kan inte tjänsten nå databasen.

## Filer

| Fil | Beskrivning |
|---|---|
| `server.js` | Node.js-servern med PostgreSQL |
| `package.json` | Node-beroenden |
| `public/index.html` | Frontend med dina 230 artiklar |
| `render.yaml` | Render Blueprint (automatisk konfiguration) |
| `.gitignore` | Filer som inte ska ingå i Git |
