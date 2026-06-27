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

// app.js anropar App.getPlaceStatus() utan ett explicit "now" - det defaultar da till verklig
// klocktid. Utan detta lass beror testernas resultat pa NAR de rakar koras (upptackt for
// verkligt 2026-06-27: apotekets lordagstid 09-14 hade redan passerat). Lasningen sker per
// jsdom-window, INNAN nagot app-skript koras, sa "new Date()" inuti app.js/openingHours.js
// alltid ger samma deterministiska tidpunkt - en onsdag mitt pa dagen, gott om marginal till
// bade oppning och stangning.
function installFixedNow(win, isoString) {
  var fixedMs = new win.Date(isoString).getTime();
  var NativeDate = win.Date;
  win.Date = class extends NativeDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixedMs);
      } else {
        super(...args);
      }
    }
    static now() {
      return fixedMs;
    }
  };
}
installFixedNow(window, '2026-06-24T12:00:00+02:00');

window.navigator.geolocation = {
  getCurrentPosition: function (success) {
    success({ coords: { latitude: 39.5696, longitude: 2.6502 } }); // nära Palma, matchar fixturen
  }
};

// Mockar enhetens sprak till svenska, for att deterministiskt aterskapa det riktiga scenariot
// personen rapporterade ("visades pa svenska") - jsdom defaultar annars till "en-US".
Object.defineProperty(window.navigator, 'language', { value: 'sv-SE', configurable: true });
Object.defineProperty(window.navigator, 'languages', { value: ['sv-SE', 'sv'], configurable: true });

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
    assert(
      'oppet-status visas som en liten prick, INTE en upprepad textbricka (fix for repetitionsproblemet)',
      card.querySelector('.status-dot') !== null && card.querySelector('.status-badge') === null
    );
    assert('kortet har en vägvisningsknapp (status ar synlig, inte gomd)', card.querySelector('.place-directions-btn') !== null);

    var expectedDist = window.App._internal.formatDistance(
      window.App._internal.distanceMeters(39.5696, 2.6502, 39.571, 2.652)
    );
    assert(
      'metaraden visar AVSTAND FORE adress (bugfix - en lang adress fick tidigare ata upp avstandet via text-overflow:ellipsis)',
      card.querySelector('.place-meta').textContent === expectedDist + ' · Carrer Major 8'
    );

    assert(
      'listrubriken ovanfor korten visar vald kategori (Apotek), kopplar kategori till listan',
      document.getElementById('listCategory').textContent.indexOf(window.App.t('categories.apotek')) !== -1
    );

    assert('chip-radens scroll-antydan (fade) finns i DOM:en', document.getElementById('chipRowFade') !== null);

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
        console.log('--- Sprakvaljare ---');
        var langSelect = document.getElementById('langSelect');
        assert('sprakvaljaren har alla 5 sprak som alternativ', langSelect.options.length === 5);
        assert('svenska ar valt vid start (auto-detect, ingen sprak-override mockad)', langSelect.value === 'sv');

        langSelect.value = 'de';
        langSelect.dispatchEvent(new window.Event('change', { bubbles: true }));

        flush(function () {
          assert('html lang-attributet uppdaterat till "de"', document.documentElement.lang === 'de');
          assert(
            'kategori-chippen visar nu tysk text (Apotheke) efter sprakbyte',
            document.querySelector('#chipRow .chip[data-cat="apotek"]').textContent.indexOf('Apotheke') !== -1
          );
          var cardAfterLangSwitch = document.querySelector('.place-card');
          assert(
            'redan synligt kort (kommunhus, okand status, visat via tidigare toggle) uppdateras till tysk text utan ny natverksbegaran',
            cardAfterLangSwitch && cardAfterLangSwitch.querySelector('.status-badge').textContent === window.App.I18N.de.status.unknown
          );

          console.log();
          console.log('Klar. OBS: mockar fetch/geolocation - verifierar UI-logiken, inte riktig');
          console.log('natverks-/GPS-atkomst (ej mojligt fran denna sandlada).');

          runGeolocationDeniedScenario();
        });
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
  installFixedNow(window2, '2026-06-24T12:00:00+02:00');

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
      'PERMISSION_DENIED (code 1) ger en specifik, atgardbar text - INTE samma generiska Mallorca-fallback som ovriga fel',
      document2.getElementById('locationText').textContent === window2.App.t('ui.locationDenied')
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

      console.log();
      console.log('--- Enhetstest: destinationParam (vagvisningens tillforlitlighet) ---');
      var dest = window2.App._internal.destinationParam;
      assert(
        'exakt nod (precise=true) -> raka koordinater, aven om namn finns',
        dest({ precise: true, lat: 39.57, lon: 2.65, name: 'Test', tags: {} }) === '39.57,2.65'
      );
      assert(
        'way/relation-centroid MED namn -> textsokning (namn + Mallorca), INTE koordinater - detta ar exakta buggen som hittades pa Son Espases',
        dest({ precise: false, lat: 39.57, lon: 2.65, name: 'Hospital Universitari Son Espases', tags: {} }) ===
          'Hospital Universitari Son Espases, Mallorca'
      );
      assert(
        'way/relation MED namn OCH adress -> bade namn och adress i sokningen',
        dest({
          precise: false,
          lat: 39.57,
          lon: 2.65,
          name: 'Hospital Test',
          tags: { 'addr:street': 'Carrer Test', 'addr:housenumber': '1' }
        }) === 'Hospital Test, Carrer Test 1, Mallorca'
      );
      assert(
        'way/relation UTAN namn -> faller tillbaka pa koordinater (inget battre att soka pa)',
        dest({ precise: false, lat: 39.57, lon: 2.65, name: null, tags: {} }) === '39.57,2.65'
      );

      console.log();
      console.log('--- Enhetstest: placeCardHtml (statusvisning, oberoende av riktig klocktid) ---');
      var cardHtml = window2.App._internal.placeCardHtml;
      var basePlace = { id: 'node/1', name: 'Test Plats', lat: 1, lon: 1, tags: {}, distance: 120 };

      var openHtml = cardHtml(Object.assign({}, basePlace, { status: { status: 'open', minutesLeft: null } }));
      assert('oppet-kort: har status-dot', openHtml.indexOf('status-dot') !== -1);
      assert('oppet-kort: INGEN status-badge (de-emphasized, se HANDOVER)', openHtml.indexOf('status-badge') === -1);

      var soonHtml = cardHtml(Object.assign({}, basePlace, { status: { status: 'soon', minutesLeft: 12 } }));
      assert(
        'stanger-snart-kort: visar faktisk tid kvar ("Stanger om 12 min"), inte bara generisk text',
        soonHtml.indexOf(window2.App.t('ui.closingInMinutes').replace('{min}', 12)) !== -1
      );
      assert('stanger-snart-kort: har status-badge (undantag, ska vara tydligt)', soonHtml.indexOf('status-badge soon') !== -1);

      var soonNoMinutesHtml = cardHtml(Object.assign({}, basePlace, { status: { status: 'soon', minutesLeft: null } }));
      assert(
        'stanger-snart UTAN kand minutangivelse faller tillbaka pa generisk "Stanger snart"-text',
        soonNoMinutesHtml.indexOf(window2.App.t('status.soon')) !== -1
      );

      var closedHtml = cardHtml(Object.assign({}, basePlace, { status: { status: 'closed', minutesLeft: null } }));
      assert('stangt-kort: har fortfarande en tydlig status-badge (undantagsfallet, inte nedtonat)', closedHtml.indexOf('status-badge closed') !== -1);

      console.log();
      console.log('--- Verifiering: ingen repetitiv ikon kvar per kort ---');
      assert('inga .place-swatch-element kvar i nagot kort (togs bort 2026-06-22)', document2.querySelectorAll('.place-swatch').length === 0);

      runOtherGeolocationErrorScenario();
    }, 0);
  }, 0);
}

// --- Scenario 3: POSITION_UNAVAILABLE/TIMEOUT (code 2/3) - ska INTE visa den
// behorighets-specifika texten, bara den generiska Mallorca-fallbacken, eftersom anvandaren
// inte kan atgarda dessa fel via installningarna. ---
function runOtherGeolocationErrorScenario() {
  console.log();
  console.log('--- Scenario: geolocation otillganglig (code 2, inte nekad behorighet) ---');

  var dom3 = new JSDOM('<!DOCTYPE html><html><head></head><body>' + bodyHtml + '</body></html>', {
    url: 'https://example.org/',
    runScripts: 'outside-only'
  });
  var window3 = dom3.window;
  var document3 = window3.document;
  installFixedNow(window3, '2026-06-24T12:00:00+02:00');

  window3.navigator.geolocation = {
    getCurrentPosition: function (success, error) {
      error({ code: 2, message: 'Position unavailable' });
    }
  };
  window3.fetch = function () {
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve(fixture); } });
  };

  ['lib/vendor/opening_hours.min.js', 'data/categories.js', 'data/i18n.js', 'api/overpassClient.js', 'lib/openingHours.js', 'lib/icons.js', 'app.js'].forEach(
    function (rel) {
      window3.eval(readFile(rel));
    }
  );
  document3.dispatchEvent(new window3.Event('DOMContentLoaded', { bubbles: true, cancelable: true }));

  setTimeout(function () {
    assert(
      'code 2 (POSITION_UNAVAILABLE) visar den GENERISKA Mallorca-fallbacken, inte behorighets-texten (anvandaren kan inte atgarda detta i installningarna)',
      document3.getElementById('locationText').textContent === window3.App.t('ui.locationFallback')
    );
  }, 0);
}
