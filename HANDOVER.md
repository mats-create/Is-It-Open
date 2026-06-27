# Öppet nu (Mallorca) — Handover Document
**Date:** 2026-06-22
**From:** Claude (denna session)
**To:** Claude (nästa session)

## Project Overview

En PWA (ingen app store, inget bygge) som visar vad som är öppet just nu inom valda kategorier
(snabbköp, supermarket, apotek, restauranger, sjukhus, kliniker, kommunal service m.fl.), med
fokus på öppet/stängt först, öppettider sekundärt. Mallorca är testområde och initialt fokus.

Personens arbetssätt: **ingen lokal utvecklingsmiljö, ingen terminal.** Allt testas via
webbläsaren (iPhone Safari + Chrome desktop). Kodhantering sker manuellt via GitHub:s
webbgränssnitt (uppladdning/nedladdning av filer), inget CI/CD. Detta är skälet till att
appen byggs som **ren HTML/CSS/JS utan bundler/byggsteg** — alla filer nedan kan laddas direkt
via `<script>`-taggar.

Kommunikationsstil: direkt, kort, inga onödiga brasklappar — men flagga risker innan de blir problem.

**Arbetssätt med GitHub (beslutat 2026-06-22):** Claude ska INTE försöka nå repot direkt
(webbhämtning är opålitlig — GitHub blockerar automatiserad åtkomst till mapplistningar via
robots.txt, så bara enskilda filer går ibland att läsa, aldrig en fullständig bild). Personen
delar aktuella filer manuellt när Claude behöver dem, och laddar upp/committar själv. Anta
ALDRIG att en fil i repot är oförändrad jämfört med vad Claude senast levererade — fråga om en
färsk kopia om det är osäkert (DEV_PRINCIPLES regel 6).

**Flerspråksstöd (beslutat 2026-06-22):** appen stödjer sv/en/de/fr/es. De tre öppna frågorna
från föregående session är lösta:
1. Etiketter bor i ny fil `data/i18n.js`, inte i `categories.js` (som nu är rent datalager).
2. OSM:s `name:xx`-taggar används INTE — platsnamn ska aldrig översättas, bara `tags.name` visas.
3. `opening_hours.js`:s `locale`-stöd behövs inte — vår wrapper anropar bara
   språkoberoende metoder. Se "Internationalisering" under Key Technical Patterns för detaljer.

## Tech Stack

| Lager | Teknik |
|---|---|
| Frontend | Ren HTML/CSS/JS, inget bundler, inget npm-byggsteg i produktion |
| Geodata | OpenStreetMap via Overpass API (`https://overpass-api.de/api/interpreter`), fritt, ingen nyckel |
| Öppettidslogik | `opening_hours.js` (vendored, se nedan), npm-paketnamn `opening_hours` |
| Hosting | GitHub Pages (ej aktiverat än, status okänd — se Backlog #7) |
| Offline-läge | Planerat (Service Worker + Cache API), ej byggt ännu |

## Architecture

```
index.html                  Sidskal: DOM-strukturen + laddar alla skript i ratt ordning
style.css                   All styling - kategorifargade chips, statusbadges, kort, tillstand
app.js                       UI-orkestrering: geolocation, rendering, kategori-/toggle-klick
lib/icons.js                 Egna SVG-ikoner (ingen extern ikonfont) + CATEGORY_STYLE (fargkluster)
data/categories.js          Kategori -> OSM-tagg-konfiguration (rent datalager, inga etiketter), enda stället att redigera för att lägga till/ta bort kategorier
data/i18n.js                 UI-strängar (kategori-etiketter, statustexter) på sv/en/de/fr/es + App.t()-hjälpfunktion
lib/openingHours.js          Wrapper runt vendor-biblioteket, mappar till appens 4 statusar (open/soon/closed/unknown)
lib/vendor/opening_hours.min.js   Tredjepartsbibliotek, vendored (se "Vendoring" nedan), rör inte manuellt
api/overpassClient.js       Bygger Overpass-frågan, hämtar, klassificerar och normaliserar träffar
test/fixture-overpass-response.json   Handskriven exempel-JSON som efterliknar ett Overpass-svar (riktig API ej nåbar från Claudes sandlåda)
test/run-tests.js           Node-testharness for datalagret (kategorier/i18n/overpass/oppettider)
test/run-ui-tests.js        Node+jsdom-testharness for UI-lagret (app.js), mockar fetch+geolocation
HANDOVER.md / INITIAL_PROMPT.md   Detta dokument + startblock för nästa session
```

**Spår A (kärnappen) är kodklar och testad i sandlåda** — se "Kända begränsningar". Inte ännu
verifierad i en riktig webbläsare med riktig GPS/nätverk, eftersom GitHub Pages inte är
aktiverat (Backlog #7). Spår B (Firebase/favoriter/delning) är inte påbörjat.

**Laddningsordning när UI byggs** (viktigt, annars är `window.App.*` inte definierat än):
`lib/vendor/opening_hours.min.js` → `data/categories.js` → `data/i18n.js` → `api/overpassClient.js` →
`lib/openingHours.js` → `app.js`. (`categories.js` och `i18n.js` är oberoende av varandra,
ordningen dem emellan spelar ingen roll — men båda måste finnas innan `app.js` körs.)

## Key Technical Patterns

### Kategori-konfiguration (data/categories.js)
- `queries` är en lista av OR-villkor, där varje OR-villkor är en lista av AND-taggar.
  Exempel: återvinning kräver `amenity=recycling` **OCH** `recycling_type=centre` på samma
  element (annars matchar varje enskild glasbehållare på gathörnet). Kliniker matchar
  `amenity=clinic` **ELLER** `amenity=doctors`. Blanda inte ihop dessa två fall vid nya kategorier.
- `missingHoursFallback`: `'open'` används bara för sjukhus (saknar ofta `opening_hours` i OSM
  just därför att de antas vara öppna dygnet runt). Alla andra kategorier defaultar till
  `'unknown'` — appen ska ALDRIG gissa stängt när data saknas, bara när den faktiskt vet.

### opening_hours.js-biblioteket — en quirk som är lätt att missa
`getStateString(date)` returnerar strängen **`'close'`** (inte `'closed'`) för "stängt just nu".
`'closed'` används bara om man explicit frågar om dåtid (`past=true`). Detta upptäcktes genom
att faktiskt köra biblioteket (se test/run-tests.js), inte genom att läsa typdefinitionerna
ytligt. `lib/openingHours.js` hanterar redan detta — gör INTE en egen jämförelse mot `'closed'`
någon annanstans i kodbasen utan att gå via `getPlaceStatus()`.

### Vendoring av opening_hours.js
- Källa: npm-paketet `opening_hours` (https://github.com/opening-hours/opening_hours.js),
  licens LGPL-3.0-only. Minifierad med terser, ~516 kB. Attribution finns som kommentarshuvud
  i filen — rör inte den raden.
- **SunCalc är medvetet INTE vendored.** Biblioteket använder SunCalc bara för
  sunrise/sunset/dawn/dusk-nyckelord i opening_hours-strängar, vilket ingen av våra kategorier
  använder. Om en framtida kategori (t.ex. badplatser) behöver soluppgång/solnedgång-baserade
  tider måste SunCalc vendoras separat och `window.SunCalc` finnas innan
  `opening_hours.min.js` laddas.

### Tidszon — kritiskt för korrekt testning (gäller INTE produktionsappen)
`opening_hours.js` läser `Date.getHours()`/`getDay()` i **processens/enhetens systemtidszon**,
inte i någon offset man skrivit in i en ISO-sträng. I en riktig webbläsare på en användares
telefon är detta inget problem — enhetens klocka är redan satt till lokal tid. Men vid testning
i Claudes sandlåda (systemtidszon UTC) ger det fel resultat med 2 timmars förskjutning om man
inte sätter `TZ=Europe/Madrid` explicit. **Kör alltid testerna med
`TZ=Europe/Madrid node test/run-tests.js`** — annars ser korrekt kod ut att vara trasig
(se KNOWN_PITFALLS #6-mönstret: kontrollera om det är koden eller kontrollen som är fel).

### Internationalisering (data/i18n.js) — beslutat 2026-06-22
- Alla UI-strängar (kategori-etiketter + statustexter) bor i `I18N[lang]`, nycklar matchar
  exakt kategori-`id` från `categories.js`. Hämtas via `App.t('categories.apotek')` /
  `App.t('status.open')` / `App.t('ui.showClosed')`.
- **Platsnamn (OSM `tags.name`) ska ALDRIG översättas.** De är egennamn. `name:en`/`name:de`
  osv. används INTE, även om OSM-data har dem — en restaurang som heter "Es Racó" ska heta
  "Es Racó" oavsett UI-språk. Detta beslutades explicit efter att ha övervägt och förkastat
  alternativet.
- **Antal i UI-text (t.ex. "X stängda") får ALDRIG böjas grammatiskt i kod** — sv/en/de/fr/es
  har olika plural-/genusregler som är lätta att göra fel. Mönster: lägg siffran i en parentes
  efter en oböjlig fras i `app.js`, t.ex. `App.t('ui.showClosed') + ' (' + n + ')'` ->
  "Visa stängda (3)". Lägg INTE in `{n}`-platshållare i `I18N` för detta.
- `opening_hours.js`:s eget `locale`-stöd används INTE — det påverkar bara biblioteketts egna
  textmetoder (`getComment()`/`prettifyValue()`) som vår wrapper inte anropar. Vår wrapper
  använder bara `getStateString()`/`getNextChange()`, som är språkoberoende.
- Språkdetektering: `navigator.language(s)` vid första besök, sparat i `localStorage`
  (`oppetnu_lang`) om användaren byter manuellt. `setLanguage()`/`t()` kraschar aldrig om
  `localStorage` är blockerat (t.ex. privat läge) — bara faller tillbaka till sessionens
  livstid istället för att spara.
- `t()` faller tillbaka till engelska om en nyckel saknas för aktuellt språk, och till
  nyckelnamnet självt (inte en krasch) om den saknas även på engelska. Just nu är alla fem
  språk fullt ifyllda — fallbacken är ett skyddsnät, inte en permanent lösning.

### Overpass-frågor
- En sammanslagen fråga per anrop (alla efterfrågade kategoriers taggar i en union), inte en
  fråga per kategori — billigare och färre nätverksanrop.
- `out center;` används så att `way`-element (byggnader, inte bara noder) ger en lat/lon direkt
  utan extra geometriupplösning.
- Klassificering av varje träff görs **klientsidan** efter hämtning (matchar tillbaka mot
  `CATEGORIES`), inte genom att lita på Overpass att gruppera taggarna åt oss.
- `app.js` filtrerar ANDÅ klientsidan på `p.category === currentCategory` efter hämtning, som
  ett extra skyddslager — om Overpass av nagon anledning skulle returnera nagot oväntat ska
  UI:t aldrig visa det i fel kategori.

### UI-lagret (app.js/style.css/index.html) — beslutat/antaget 2026-06-22
- **"Öppettider okända" döljs som standard, grupperat med "Stängt"** bakom den globala
  visa/dölj-knappen. Logiken: principen är "visa det som är öppet, primärt" — ett okänt läge
  är inte bekräftat öppet, så det ska inte ta plats i förstavisningen. **Detta är ett antagande,
  inte uttryckligen bekräftat av personen** — lätt att ändra, se `isHiddenByDefault()`/
  `statusRank()` i `app.js`.
- **Ingen reverse-geocoding.** Platstexten i headern visar bara "Nära dig" eller
  "Mallorca (hela ön)" — inte ett riktigt ortnamn. Skulle kräva en till datakälla/API.
- **Geolocation-bbox runt användaren är ±0.09° (~10 km)**, en gissning för att glesare
  kategorier (sjukhus, kommunhus) ska ge träffar. Konstant `LOCAL_BBOX_DELTA` i `app.js`,
  enkel att justera när vi ser riktiga resultat i en webbläsare.
- **Geolocation-fel hanteras likadant oavsett orsak** (nekat/otillgängligt/timeout) — faller
  tillbaka till hela Mallorca-bboxen och visar fallback-texten. Ingen specialhantering per
  felkod i v1.
- **Färgkluster, inte 12 unika färger:** kategorierna delar 5 färgfamiljer tematiskt (hälsa =
  rosa: apotek/sjukhus/kliniker; samhällsservice = indigo: kommunhus/bibliotek/polis/post/
  aktiviteter; coral/teal/lila för de ursprungliga fyra). Skiljs åt av ikon inom klustret.
  Samma hex-värden som redan godkänts i chattens mockuper — gröna/gula/grå undviks helt för
  kategorier eftersom de är reserverade för statusfärgerna.
- **Egna SVG-ikoner** (`lib/icons.js`), inget externt ikonfont-bibliotek — håller appen
  fristående och offline-vänlig. **Inte visuellt korrekturlästa i en riktig webbläsare än**
  (kan inte rendera/skärmdumpa SVG i Claudes sandlåda) — vänta dig att finjustera utseendet
  första gången de faktiskt syns.
- **Manuellt språkval i UI:t är INTE byggt** — bara auto-detect (`navigator.language` ->
  `localStorage`). Se Backlog #13.

## Current State of Each File

### data/categories.js
12 kategorier definierade (se kod för exakt lista). Varje post: `id`, `queries`,
`missingHoursFallback` — INGEN `label` längre (flyttat till `data/i18n.js`, se nedan). Byggs
till `window.App.CATEGORIES` (array) och `window.App.CATEGORIES_BY_ID` (lookup).

### data/i18n.js
Byggs till `window.App.I18N` (alla strängar), `window.App.SUPPORTED_LANGUAGES` (`['sv','en','de','fr','es']`),
`window.App.currentLang` (auto-detekterad), `window.App.setLanguage(lang)`, `window.App.t(path)`.
`t('categories.<id>')` och `t('status.<open|soon|closed|unknown>')` är de viktigaste för UI:t.
Kategori-id:na här MÅSTE matcha id:na i `categories.js` exakt — testat i `test/run-tests.js`.

### lib/openingHours.js
Exponerar `window.App.getPlaceStatus(tags, categoryId, now)` ->
`{ status, nextChange, minutesLeft, assumed?, reason?, error? }`. `status` är alltid en av
`'open' | 'soon' | 'closed' | 'unknown'`. `SOON_THRESHOLD_MINUTES = 30`, hårdkodat i toppen av
filen om det ska bli konfigurerbart senare.

### api/overpassClient.js
Exponerar `buildOverpassQuery(categoryIds, bbox)`, `classifyCategory(tags)`,
`normalizeElement(el)`, `fetchPlaces(categoryIds, bbox)` (den sista returnerar ett Promise,
ej testad mot riktig nätverksåtkomst än).

### lib/icons.js
Exponerar `window.App.ICONS` (lookup id -> SVG-sträng), `window.App.getIcon(name)`, och
`window.App.CATEGORY_STYLE` (id -> `{tint, mid, deep}` hexfärger). Lägg till nya ikoner/färger
här, INTE i `categories.js` eller `i18n.js`.

### app.js
Hela UI-orkestreringen. `state`-objektet (currentCategory, showClosed, userCoords, places) är
modulscopat, inte global. `init()` har ett `initialized`-vakt-flagga (skyddar mot dubbel-körning
— upptäckt via ett testfel i jsdom, se Known Patterns nedan, men är bra robusthet även i en
riktig webbläsare). Exponerar `App._internal` (distanceMeters, formatDistance, formatAddress,
statusRank, isHiddenByDefault, state) — bara för `test/run-ui-tests.js`, används inte av sidan
själv.

### index.html / style.css
Sidskal respektive styling. Inget oväntat — flat struktur, laddar skripten i den dokumenterade
ordningen. `style.css` har inga externa typsnitt/CDN-beroenden.

## Backlog (prioriterad)

1. ✅ **DONE** — Datalager: kategori-konfiguration, Overpass-klient, opening_hours-wrapper, vendored bibliotek, testat mot mock-fixture.
2. ✅ **DONE** — Flerspråksstöd (sv/en/de/fr/es): `data/i18n.js` byggt och testat, `categories.js` rensat från etiketter. Se "Internationalisering" under Key Technical Patterns.
3. **Skapa GitHub-repo** — KLART (`https://github.com/mats-create/Is-It-Open`, bekräftat 2026-06-22).
4. ✅ **DONE (kodklart, ej webblasarverifierat)** — `index.html`/`style.css`/`app.js` byggda, testade i jsdom (24 UI-tester + 12 datalager-tester, alla gröna). Se "UI-lagret" under Key Technical Patterns för antaganden gjorda utan explicit bekräftelse.
5. **Verifiera mot riktig overpass-api.de OCH riktig geolocation i en riktig webbläsare** — kan inte göras från Claudes sandlåda. Första riktiga testet sker när sidan körs på GitHub Pages. Förvänta dig att justera `LOCAL_BBOX_DELTA` och ikonernas utseende efter detta.
6. ~~**Geolocation-integration**~~ — KLART, ingår i punkt 4.
7. **GitHub Pages-uppsättning** — Settings → Pages → Deploy from branch. Status okänd, fråga personen. Blockerar punkt 5.
8. **Sökflöde** — visa status oavsett öppet/stängt/stänger snart vid explicit sökning efter ett specifikt ställe. Ej designat än. Hör ihop med Spår B (REQ-004 i BACKLOG.md).
9. ~~**Ajuntament-ärenden som egna kategorier**~~ — **MEDVETET UTESLUTET ur v1.** Länk till ortens ajuntament-webbplats under Kommunhus-kategorin istället.
10. ~~**Evenemangskalender**~~ — **MEDVETET UTESLUTET ur v1.** v1 = fysiska platser (`community_centre`), inte händelser.
11. **Offline-läge** — Service Worker + Cache API, planerat men inte påbörjat.
12. **Fristående app-känsla** — `manifest.json` + "lägg till på hemskärm"-flöde, inte påbörjat.
13. **Ett enskilt UI-språkval i appen** (inte bara auto-detect) — meny/knapp för att manuellt byta språk via `App.setLanguage()`. Ej designat var i UI:t den ska sitta.
14. **Spår B: Firebase-konto, favoriter, delning** — egen utrednings- och bekräftelsecykel, se `BACKLOG.md` REQ-003/REQ-004. Inte påbörjat.

## Known Patterns & Gotchas

- **`'close'` vs `'closed'`** från opening_hours.js — se "Key Technical Patterns" ovan. Redan hanterat i `lib/openingHours.js`, men kom ihåg om koden refaktoreras.
- **Saknad `opening_hours`-tagg ska INTE tolkas som stängt** — särskilt vanligt för sjukhus (antas öppet) och myndigheter/bibliotek/kommunhus (visas som "okänt", aldrig gissat).
- **`recycling_type=container` ska inte matcha återvinnings-kategorin** — bara `recycling_type=centre`. Testat explicit i test/run-tests.js eftersom det är lätt att råka matcha för brett.
- **TZ-fallgrop vid testning** — se ovan, gäller bara Claudes sandlåda/Node-testning, inte produktionsappen i en riktig webbläsare.
- **SunCalc saknas medvetet** — sunrise/sunset-nyckelord i opening_hours stöds inte än.
- **Self-closing-tag-balansräkning** (från DEV_PRINCIPLES/KNOWN_PITFALLS) — kollat for
  `index.html`, balanserat (se `test/run-ui-tests.js`-sessionens validering). Kolla om om
  fler HTML-filer läggs till.
- **Bash-heredoc kan tappa UTF-8-tecken.** En accent ("à") föll bort när en testfixtur skapades
  via `cat > fil << 'EOF'` tidigare i projektet — upptäcktes för att en assert jämförde mot fel
  sträng. `create_file`/`str_replace` har INTE samma problem (verifierat med hexdump). Använd
  dem för filer med icke-ASCII-tecken, undvik bash-heredocs för sådant innehåll.
- **jsdom eldar sitt eget interna `DOMContentLoaded` asynkront**, utöver ett manuellt
  `dispatchEvent` i testkoden — kan trigga `init()` två gånger i tester och dubbelregistrera
  klick-lyssnare (symptom: en knapp "växlar fram och tillbaka" och verkar inte göra något).
  `app.js` skyddar mot detta med en `initialized`-flagga i `init()` — bra robusthet oavsett,
  men upptäckt just via detta testartefakt, inte ett verkligt webbläsarproblem.

## Session Log

### Session — 2026-06-21
- Bekräftade arbetsprinciper (DEV_PRINCIPLES) och kända fallgropar (KNOWN_PITFALLS) från tidigare projekt.
- Pivoterade arkitektur från React Native/Expo till ren PWA (no-build) efter att personen klargjorde att de inte har lokal devmiljö/terminal.
- Designade och itererade UI-mockuper i chatten (kategori-chips, statusfärger, global "visa stängda"-toggle) — godkänt, men inte ännu kopplat till riktig data.
- Researchade och bekräftade OSM-taggar för alla 12 kategorier mot OpenStreetMap-wikin.
- Byggde och **testade** datalagret: `data/categories.js`, `api/overpassClient.js`, `lib/openingHours.js`, vendored `opening_hours.min.js`. Alla 11 tester i `test/run-tests.js` passerar (`TZ=Europe/Madrid node test/run-tests.js`).
- Hittade och fixade ett fel i mitt eget testantagande (förväntade "open" där rätt svar var "soon") — kvar som exempel på varför man kör testerna istället för att bara läsa koden.
- Filer skapade men ej uppladdade till GitHub än (repo-status okänd, se Backlog #2).
- Personen flaggade ett nytt krav i slutet av sessionen: appen ska stödja sv/en/de/fr/es (fler
  språk kan tillkomma). Inte arkitekturellt hanterat än — fångat som högsta backlog-prioritet
  för nästa session, med tre konkreta öppna frågor (se Project Overview).

### Session — 2026-06-22
- Bekräftade att GitHub-repot är skapat (`https://github.com/mats-create/Is-It-Open`) och att
  `.gitignore` samt mapparna `api/`, `data/`, `lib/`, `test/` finns där.
- Claude försökte verifiera repo-innehållet via webbhämtning: lyckades läsa repots förstasida
  och en enskild fil (`.gitignore`, innehåll bekräftat identiskt), men GitHub blockerar
  automatiserad åtkomst till mapplistningar (robots.txt) — kunde alltså INTE bekräfta varje
  fil. Personen bad Claude sluta försöka nå repot direkt och istället förlita sig på att
  personen delar aktuella filer manuellt — antecknat som permanent arbetssätt ovan.
- Löste flerspråksfrågan (se "Internationalisering" under Key Technical Patterns): byggde
  `data/i18n.js` (sv/en/de/fr/es, alla 12 kategorier + 4 statusnycklar + UI-strängar), tog bort
  `label` från `categories.js`.
- Utökade `test/run-tests.js` med konsistenskontroller mellan `categories.js` och `i18n.js`
  (alla kategori-id:n har en översättning på alla språk, `t()`-fallback fungerar). Alla 23
  tester passerar (`TZ=Europe/Madrid node test/run-tests.js`).
- Beslutade Spår A/Spår B-uppdelningen för det stora kontosynk-kravet (riktig backend via
  Firebase, bekräftat av personen) — Spår A (kärnappen) byggs nu, Spår B (Firebase/favoriter/
  delning) som egen utrednings- och bekräftelsecykel senare. Skapade `BACKLOG.md` (i projektets
  fil-area, inte GitHub-repot) för strukturerad kravloggning.
- **Byggde Spår A:** `index.html`, `style.css`, `app.js`, `lib/icons.js` (egna SVG-ikoner +
  färgkluster per kategori). La till 6 nya UI-strängar i `data/i18n.js` (alla 5 språk).
- Byggde `test/run-ui-tests.js` (jsdom) och testade hela UI-flödet: kategoribyte, statusgruppering,
  global dölj-toggle, geolocation lyckad/nekad, avståndsformatering. 24 tester, alla gröna.
- Hittade och fixade tre verkliga problem under testningen: (1) en UTF-8-accent som tappades
  via en bash-heredoc i en tidigare testfixtur, (2) ett dubbelt `init()`-anrop i jsdom som
  dolde en växlingsbugg, (3) ett eget testantagande som var fel (förväxlade vilken kategori
  som fanns i testfixturen). Se Known Patterns & Gotchas.
- **Inte verifierat i en riktig webbläsare än** — GitHub Pages är inte aktiverat. Ikonernas
  visuella utseende är heller inte korrekturläst (kan inte rendera SVG i sandlådan).
