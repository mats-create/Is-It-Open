// Rev: 2026-06-21 — Initial test harness.
//
// VIKTIGT: körs med Node, INTE en del av själva webbsidan. Detta är ett internt
// utvecklingsverktyg (motsvarande "simulera kodvägen innan den anses klar", se
// DEV_PRINCIPLES regel 4) — inte ett automatiskt test som måste köras av användaren.
//
// Kör så här (timezone MÅSTE sättas explicit - se "Kända begränsningar" i HANDOVER.md
// för varför):
//   TZ=Europe/Madrid node test/run-tests.js
//
// Laddar filerna i en vm-context utan require/module/exports/define, för att
// efterlikna hur en <script>-tagg laddar dem i en riktig webbläsare (annars tar
// opening_hours.min.js sin CommonJS-gren och letar efter ett "suncalc"-paket som
// inte ska behövas här).

var vm = require('vm');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var sandbox = {};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);

['lib/vendor/opening_hours.min.js', 'data/categories.js', 'data/i18n.js', 'api/overpassClient.js', 'lib/openingHours.js'].forEach(function (rel) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
});

function assert(label, cond) {
  console.log((cond ? 'OK  ' : 'FEL ') + label);
  if (!cond) process.exitCode = 1;
}

var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
assert('process-timezone ar Europe/Madrid (sätt TZ=Europe/Madrid om detta felar)', tz === 'Europe/Madrid');

var fixture = JSON.parse(fs.readFileSync(path.join(root, 'test/fixture-overpass-response.json'), 'utf8'));
var places = fixture.elements.map(sandbox.App.normalizeElement);

var byName = {};
places.forEach(function (p) { byName[p.name] = p; });

assert('apotek klassificeras ratt', byName['Farmàcia Test Centre'].category === 'apotek');
assert('sjukhus klassificeras ratt', byName['Hospital Test'].category === 'sjukhus');
assert('kommunhus klassificeras ratt', byName['Ajuntament Test'].category === 'kommunhus');
assert('atervinningscentral klassificeras ratt', byName['Punt Verd Test'].category === 'atervinning');
assert(
  'enskild atervinningsbehallare (container) matchar INTE atervinning-kategorin',
  byName['Glascontainer (ska INTE matcha atervinning-kategorin)'].category === null
);

var fredagKvall = new Date('2026-06-19T19:45:00+02:00');
var apotekKvallStatus = sandbox.App.getPlaceStatus(byName['Farmàcia Test Centre'].tags, 'apotek', fredagKvall);
assert('apotek "stanger snart" fredag 19:45 (stanger 20:00, 15 min kvar, under 30-min-troskeln)', apotekKvallStatus.status === 'soon' && apotekKvallStatus.minutesLeft === 15);

var fredagMitt = new Date('2026-06-19T12:00:00+02:00');
var apotekMittStatus = sandbox.App.getPlaceStatus(byName['Farmàcia Test Centre'].tags, 'apotek', fredagMitt);
assert('apotek vanligt "oppet" fredag 12:00 (gott om tid till stangning, inte "snart")', apotekMittStatus.status === 'open');

var lordagFm = new Date('2026-06-20T10:00:00+02:00');
var apotekLordag = sandbox.App.getPlaceStatus(byName['Farmàcia Test Centre'].tags, 'apotek', lordagFm);
assert('apotek oppet lordag 10:00 (Sa 09:00-14:00)', apotekLordag.status === 'open');

var sjukhusStatus = sandbox.App.getPlaceStatus(byName['Hospital Test'].tags, 'sjukhus', lordagFm);
assert('sjukhus utan opening_hours-tagg antas oppet (missingHoursFallback)', sjukhusStatus.status === 'open' && sjukhusStatus.assumed === true);

var kommunhusStatus = sandbox.App.getPlaceStatus(byName['Ajuntament Test'].tags, 'kommunhus', lordagFm);
assert('kommunhus utan opening_hours-tagg -> unknown, ALDRIG gissat stangt/oppet', kommunhusStatus.status === 'unknown');

var query = sandbox.App.buildOverpassQuery(['apotek', 'sjukhus'], { south: 39.25, west: 2.30, north: 39.95, east: 3.50 });
assert('byggd Overpass-fraga innehaller bade pharmacy och hospital', query.indexOf('pharmacy') !== -1 && query.indexOf('hospital') !== -1);

console.log();
console.log('--- i18n: konsistens mellan categories.js och i18n.js ---');
assert('categories.js har inget kvarglomt label-falt (etiketter ska bo i i18n.js)', sandbox.App.CATEGORIES.every(function (c) { return !('label' in c); }));

var STATUS_KEYS = ['open', 'soon', 'closed', 'unknown'];
sandbox.App.SUPPORTED_LANGUAGES.forEach(function (lang) {
  var catOk = sandbox.App.CATEGORIES.every(function (c) {
    var v = sandbox.App.I18N[lang].categories[c.id];
    return typeof v === 'string' && v.length > 0;
  });
  assert('alla ' + sandbox.App.CATEGORIES.length + ' kategorier har en icke-tom etikett pa "' + lang + '"', catOk);

  var statusOk = STATUS_KEYS.every(function (key) {
    var v = sandbox.App.I18N[lang].status[key];
    return typeof v === 'string' && v.length > 0;
  });
  assert('alla 4 statusnycklar (open/soon/closed/unknown) finns pa "' + lang + '"', statusOk);

  var uiKeysExpected = Object.keys(sandbox.App.I18N[sandbox.App.FALLBACK_LANG].ui);
  var uiOk = uiKeysExpected.every(function (key) {
    var v = sandbox.App.I18N[lang].ui[key];
    return typeof v === 'string' && v.length > 0;
  });
  assert('alla ' + uiKeysExpected.length + ' ui-nycklar (fran fallback-spraket) finns pa "' + lang + '"', uiOk);
});

console.log();
console.log('--- i18n: t()-funktionen ---');
sandbox.App.setLanguage('de');
assert('t() ger tysk etikett for apotek nar currentLang=de', sandbox.App.t('categories.apotek') === 'Apotheke');
assert('t() ger tysk statustext for "soon"', sandbox.App.t('status.soon') === 'Schließt bald');

sandbox.App.setLanguage('sv');
assert('t() bytter tillbaka till svenska efter setLanguage', sandbox.App.t('categories.apotek') === 'Apotek');

assert('t() faller tillbaka pa engelska for en saknad nyckel istallet for att krascha', sandbox.App.t('ui.does.not.exist') === 'ui.does.not.exist');

var template = sandbox.App.t('ui.directionsTo').replace('{name}', "Es Racó");
assert('mall-ersattning for platsnamn fungerar utan att paverka sjalva platsnamnet', template === 'Vägvisning till Es Racó');

console.log();
console.log('Klar. OBS: detta verifierar bara kodlogiken mot en handskriven exempel-JSON,');
console.log('inte ett riktigt svar fran overpass-api.de (ej natkomst fran detta sandlade-lage).');
