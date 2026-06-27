# BACKLOG — Öppet nu (Mallorca)

**Syfte:** strukturerad logg över alla krav — nya, ändrade och avförda — så att de hanteras
konsekvent istället för att bara leva i chatthistorik. Det här är INTE samma som `HANDOVER.md`:

- `HANDOVER.md` (i GitHub-repot) = tekniskt nuläge: vilka filer finns, hur de fungerar, vad
  som är kvar att bygga rent praktiskt just nu.
- `BACKLOG.md` (här, i projektets fil-area) = kravlogg: VAD vi har beslutat att bygga, VARFÖR,
  och VILKEN status det har — oavsett om det redan är genomfört tekniskt.

**Statusar:**
- 💡 Föreslaget — någon har väckt idén, inte bekräftat ännu
- ✅ Bekräftat — beslutat, väntar på att byggas
- 🔨 Pågående — under arbete
- ✔️ Klart — byggt och testat
- 🚫 Avfört — medvetet uteslutet (skälet anges, så det inte tas upp igen utan ny information)

**Regel:** innan ett nytt eller ändrat krav börjar byggas ska det stå här med status ✅ eller
🔨 — inte bara nämnas i en chatt och sedan glömmas bort. Vid avslutad session, uppdatera status
här OCH i `HANDOVER.md` (de ska aldrig motsäga varandra om något är klart eller inte).

---

## Kravlogg

### REQ-001 — Kärnfunktion: visa öppna platser per kategori (Mallorca)
**Status:** 🔨 Pågående (kodklart, väntar på webbläsarverifiering). Hela Spår A
(`index.html`/`style.css`/`app.js` + datalagret) är byggt och testat i sandlåda (36 tester
gröna totalt). Inte ännu verifierat mot riktig Overpass-API eller riktig GPS i en webbläsare —
kräver GitHub Pages aktiverat (se `HANDOVER.md` Backlog #7).
**Princip:** öppet visas primärt, stängt göms bakom global toggle, öppettider är sekundär info.

### REQ-002 — Flerspråksstöd (sv/en/de/fr/es)
**Status:** ✔️ Klart. `data/i18n.js`. Fler språk kan läggas till senare utan strukturändring.

### REQ-003 — Favoriter med kontosynk mellan enheter
**Status:** ✅ Bekräftat (2026-06-22). Nivå: riktig kontosynk via backend (Firebase), inte
lokal lagring eller export/import-länk. Kallas **Spår B** i planeringen — egen utrednings- och
bekräftelsecykel innan kod skrivs, separat från Spår A.
**Beslutat samtidigt:** Firebase (inte Supabase) — personen har använt Firebase i tidigare
projekt (Job Tracker), bedöms som en framkomlig väg.
**Öppet:** exakt datamodell, säkerhetsregler, kontoflöde (registrering/inloggning/radering av
konto för GDPR) — utreds när Spår B påbörjas, inte innan.

### REQ-004 — Dela kartnålar via länk
**Status:** ✅ Bekräftat (2026-06-22). URL-baserad deep link (`?plats=typ/id`), ingen inloggning
krävs för mottagaren. Hör ihop med REQ-003 (Spår B) eftersom delning av en hel favoritlista
(inte bara en plats) sannolikt återanvänder samma mekanism — men delning av EN plats kräver
inget konto och skulle kunna byggas oberoende av Spår B om det blir aktuellt tidigare.

### REQ-005 — Sökflöde visar alltid riktig status
**Status:** ✅ Bekräftat. Vid explicit sökning efter en specifik plats (eller via en delad
länk, se REQ-004) visas öppet/stänger snart/stängt/okänt oavsett det globala
"dölj stängda"-filtret. Själva sökgränssnittet är inte designat än.

### REQ-006 — Offline-läge
**Status:** 💡 Föreslaget (från projektstart). Service Worker + Cache API. Inte närmare utrett.

### REQ-007 — Fristående app-känsla
**Status:** 💡 Föreslaget (från projektstart). `manifest.json` + "lägg till på hemskärm".

### REQ-008 — Ajuntament-ärenden som egna kategorier (bygglov, folkbokföring, parkeringstillstånd, intyg, tomtplaner)
**Status:** 🚫 Avfört för v1. Inte OSM-taggbart — det är ärenden, inte platstyper. Löses istället
som en länk till ortens ajuntament-webbplats under Kommunhus-kategorin. Skulle kräva manuellt
curerad data per ort för att göras "på riktigt" — eget delprojekt om det blir aktuellt.

### REQ-009 — Evenemangs-/aktivitetskalender
**Status:** 🚫 Avfört för v1. "Lokala aktiviteter" tolkas som fysiska platser
(`amenity=community_centre`), inte tidsbundna händelser — annan datatyp helt, kräver annan
datakälla än OSM.

---

## Relevant tidigare erfarenhet (Job Tracker)

Job Tracker bjöd in andra användare och använde Firebase — `KNOWN_PITFALLS.md` #14–#16
(åtkomstkontroll/gating) kommer direkt från det projektet och gäller sannolikt rakt av för
REQ-003. När Spår B påbörjas: be om Job Trackers säkerhetsregler (Firestore rules) och eventuell
inbjudningslogik som referens — INTE de faktiska Firebase-nycklarna/konfigurationen, eftersom
varje Firebase-projekt har sina egna.
