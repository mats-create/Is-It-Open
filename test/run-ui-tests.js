// Rev: 2026-06-22 — UI-lagrets testharness (jsdom). Körs av Claude under utveckling, INTE en
// del av själva webbsidan. Mockar navigator.geolocation och fetch eftersom riktig GPS/nätverk
// inte finns i den här sandlådan - se HANDOVER.md "Kända begränsningar".
//
// Kör: TZ=Europe/Madrid node test/run-ui-tests.js

var fs = require('fs');
var path = require('path');
var { JSDOM } = require('jsdom');

var root = path.join(__dirname, '..');

function readFile(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

var bodyHtml = readFile('index.html').match(/<body>([\s\S]*)<\/body>/)[1];
// Ta bort <script>-taggarna ur den extraherade body-html:en - vi laddar skripten manuellt
// nedan i kontrollerad ordning istället, så vi kan mocka fetch/geolocation innan app.js körs.
bodyHtml = bodyHtml.replace(/<script[^>]*><\/script>\s*/g, '');

var dom = new JSDOM('<!DOCTYPE html><html><head></head><body>' + bodyHtml + '</body></html>', {
  url: 'https://example.org/',
  runScripts: 'outside-only'
});
var window = dom.window;
var document = window.document;

var fixture = JSON.parse(readFile('test/fixture-overpass-response.json'));

window.navigator.geolocation = {
  getCurrentPosition: function (success) {
    success({ coords: { latitude: 39.5696, longitude: 2.6502 } }); // nära Palma, matchar fixturen
  }
};

var fetchCallCount = 0;
window.fetch = function () {
  fetchCallCount += 1;
  return Promise.resolve({
    ok: true,
    json: function () {
      return Promise.resolve(fixture);
    }
  });
};

['lib/vendor/opening_hours.min.js', 'data/categories.js', 'data/i18n.js', 'api/overpassClient.js', 'lib/openingHours.js', 'lib/icons.js', 'app.js'].forEach(
  function (rel) {
    window.eval(readFile(rel));
  }
);

// jsdom skapar dokumentet med readyState "loading" och eldar inte DOMContentLoaded synkront -
// app.js har bara registrerat en lyssnare an. Trigga den deterministiskt istallet for att
// formodligen ratt gissa nar jsdoms egen interna timing rakar koras.
document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true, cancelable: true }));

function assert(label, cond) {
  console.log((cond ? 'OK  ' : 'FEL ') + label);
  if (!cond) process.exitCode = 1;
}

function flush(fn) {
  // Vänta in mikrotasks (Promise-kedjan i loadPlaces) innan vi läser av DOM:en.
  setTimeout(fn, 0);
}

assert('process-timezone ar Europe/Madrid', Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/Madrid');
assert('12 kategori-chips renderade', document.querySelectorAll('#chipRow .chip').length === 12);
assert('forsta chippen (snabbkop) ar aktiv vid start', document.querySelector('#chipRow .chip.active').dataset.cat === 'snabbkop');

flush(function () {
  assert('fetch anropades minst en gang (initial laddning)', fetchCallCount >= 1);
  assert(
    'huvudtext visar "nara dig" eftersom geolocation lyckades',
    document.getElementById('locationText').textContent === window.App.t('ui.nearYou')
  );
  // Fixturen har inga shop=convenience-element -> "snabbkop" ska ge "inga resultat", inte krascha.
  assert(
    'tom kategori (snabbkop, finns ej i fixturen) visar "inga resultat", inte fel/krasch',
    document.querySelector('.state-message') !== null && document.querySelector('.place-card') === null
  );

  // Byt till apotek - finns i fixturen (1 öppen, ingen stängd/snart i just det datat vid testtillfället).
  var apotekChip = document.querySelector('#chipRow .chip[data-cat="apotek"]');
  apotekChip.click();

  flush(function () {
    var cards = document.querySelectorAll('.place-card');
    assert('apotek-kategorin visar minst ett kort efter byte', cards.length >= 1);
    assert('apotek-chippen blev aktiv, snabbkop-chippen avaktiverad', document.querySelector('.chip.active').dataset.cat === 'apotek');

    var card = cards[0];
    assert('kortet visar platsnamnet fran fixturen', card.querySelector('.place-name').textContent === 'Farmàcia Test Centre');
    assert('kortet har en statusbricka med text (inte tom)', card.querySelector('.status-badge').textContent.length > 0);
    assert('kortet har en vägvisningsknapp (status ar synlig, inte gomd)', card.querySelector('.place-directions-btn') !== null);

    // Byt till kommunhus - finns i fixturen men UTAN opening_hours -> ska bli "unknown",
    // vilket per vart antagande ska doljas av standard-filtret (grupperat med stangt).
    var kommunhusChip = document.querySelector('#chipRow .chip[data-cat="kommunhus"]');
    kommunhusChip.click();

    flush(function () {
      assert(
        'kommunhus (okand status) doljs som standard - "inga resultat" visas',
        document.querySelector('.place-card') === null
      );

      var toggleBtn = document.getElementById('toggleClosedBtn');
      assert('dolj-knappen visar en raknare (1 dold plats) nar nagot ar dolt', toggleBtn.textContent.indexOf('1') !== -1);

      toggleBtn.click();

      flush(function () {
        var cardsAfterToggle = document.querySelectorAll('.place-card');
        assert('efter att ha klickat "visa stangda" syns kommunhus-kortet', cardsAfterToggle.length === 1);
        assert('kommunhus-kortet har klassen is-closed (tonas ner visuellt)', cardsAfterToggle[0].classList.contains('is-closed'));
        assert(
          'kommunhus-kortets statusbricka sager "okand", inte "stangt" (fick aldrig gissas)',
          cardsAfterToggle[0].querySelector('.status-badge').textContent === window.App.t('status.unknown')
        );
        assert(
          'kommunhus-kortet saknar vägvisningsknapp (dold status -> ingen riktad atgard)',
          cardsAfterToggle[0].querySelector('.place-directions-btn') === null
        );

        console.log();
        console.log('Klar. OBS: mockar fetch/geolocation - verifierar UI-logiken, inte riktig');
        console.log('natverks-/GPS-atkomst (ej mojligt fran denna sandlada).');

        runGeolocationDeniedScenario();
      });
    });
  });
});

// --- Scenario 2: anvandaren nekar geolocation - mycket vanligt i verkligheten, far ALDRIG
// krascha appen. Separat JSDOM-instans for ett rent utgangslage. ---
function runGeolocationDeniedScenario() {
  console.log();
  console.log('--- Scenario: geolocation nekad ---');

  var dom2 = new JSDOM('<!DOCTYPE html><html><head></head><body>' + bodyHtml + '</body></html>', {
    url: 'https://example.org/',
    runScripts: 'outside-only'
  });
  var window2 = dom2.window;
  var document2 = window2.document;

  window2.navigator.geolocation = {
    getCurrentPosition: function (success, error) {
      error({ code: 1, message: 'User denied geolocation' });
    }
  };
  var fetchCallCount2 = 0;
  window2.fetch = function () {
    fetchCallCount2 += 1;
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve(fixture); } });
  };

  ['lib/vendor/opening_hours.min.js', 'data/categories.js', 'data/i18n.js', 'api/overpassClient.js', 'lib/openingHours.js', 'lib/icons.js', 'app.js'].forEach(
    function (rel) {
      window2.eval(readFile(rel));
    }
  );
  document2.dispatchEvent(new window2.Event('DOMContentLoaded', { bubbles: true, cancelable: true }));

  setTimeout(function () {
    assert('nekad geolocation kraschar INTE appen - chips renderas fortfarande', document2.querySelectorAll('#chipRow .chip').length === 12);
    assert(
      'platstexten visar Mallorca-fallback, inte "nara dig", nar geolocation nekas',
      document2.getElementById('locationText').textContent === window2.App.t('ui.locationFallback')
    );
    assert('fetch anropas anda (fallback-bbox anvands istallet for att ge upp)', fetchCallCount2 >= 1);

    document2.querySelector('#chipRow .chip[data-cat="apotek"]').click();
    setTimeout(function () {
      var card = document2.querySelector('.place-card');
      assert('apotek-kortet renderas anda, utan avstand (ingen anvandarposition kand)', card !== null);
      assert(
        'avstand utelamnas helt fran kortets metarad nar position saknas (ingen "null m")',
        card.querySelector('.place-meta').textContent.indexOf('null') === -1
      );

      console.log();
      console.log('--- Enhetstest: formatDistance ---');
      var f = window2.App._internal.formatDistance;
      assert('formatDistance(450) -> "450 m" (avrundat till narmaste 10 m)', f(450) === '450 m');
      assert('formatDistance(1500) ger km med decimal', /1[.,]5\s?km/.test(f(1500)));
      assert('formatDistance(null) ger tom strang, inte "null"', f(null) === '');
    }, 0);
  }, 0);
}
