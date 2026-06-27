// Rev: 2026-06-22 — Initial app.js. Binder ihop data-lagret (categories/i18n/overpassClient/
// openingHours/icons) med DOM:en. Antaganden gjorda här som INTE explicit bekräftats än:
//   1. "Öppettider okända" grupperas med "Stängt" bakom det globala dölj-filtret (inte visad
//      som standard) - rimligt givet principen "visa det som är öppet, primärt", men inte
//      uttryckligen diskuterat. Lätt att ändra (se STATUS_RANK/isHiddenByDefault nedan).
//   2. Geolocation-bbox runt användaren är ±0.09 grader (~10 km) - en gissning på rimlig radie
//      för glesare kategorier (sjukhus, kommunhus). Justerbar, se LOCAL_BBOX_DELTA.
//   3. Ingen reverse-geocoding (vi visar inte en riktig ortnamn-text) - bara "Nära dig" eller
//      "Mallorca (hela ön)" som fallback. Riktigt ortnamn skulle kräva en till datakälla.

(function (root) {
  'use strict';

  var App = root.App;

  var MALLORCA_BBOX = { south: 39.25, west: 2.3, north: 39.95, east: 3.5 };
  var LOCAL_BBOX_DELTA = 0.09; // ~10 km - se antagande #2 ovan
  var SOON_AND_OPEN_VISIBLE_BY_DEFAULT = ['open', 'soon'];

  var LOCALE_TAGS = { sv: 'sv-SE', en: 'en-GB', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' };

  var state = {
    currentCategory: App.CATEGORIES[0].id,
    showClosed: false,
    userCoords: null, // { lat, lon } eller null om geolocation inte gav nagot
    locationErrorCode: null, // null | 1 (PERMISSION_DENIED) | 2 (UNAVAILABLE) | 3 (TIMEOUT)
    places: [] // senast hamtade+klassificerade platser for currentCategory
  };

  var els = {}; // DOM-referenser, satta i init()

  function localeTag() {
    return LOCALE_TAGS[App.currentLang] || LOCALE_TAGS[App.FALLBACK_LANG];
  }

  function bboxAround(lat, lon) {
    return {
      south: lat - LOCAL_BBOX_DELTA,
      north: lat + LOCAL_BBOX_DELTA,
      west: lon - LOCAL_BBOX_DELTA,
      east: lon + LOCAL_BBOX_DELTA
    };
  }

  function currentBbox() {
    if (state.userCoords) {
      return bboxAround(state.userCoords.lat, state.userCoords.lon);
    }
    return MALLORCA_BBOX;
  }

  // Haversine - avstånd i meter mellan två lat/lon-punkter.
  function distanceMeters(lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var toRad = function (d) {
      return (d * Math.PI) / 180;
    };
    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function formatDistance(meters) {
    if (meters == null) return '';
    if (meters < 1000) {
      return Math.round(meters / 10) * 10 + ' m';
    }
    var km = meters / 1000;
    return km.toLocaleString(localeTag(), { maximumFractionDigits: 1 }) + ' km';
  }

  function formatAddress(tags) {
    var street = tags['addr:street'];
    var num = tags['addr:housenumber'];
    if (street && num) return street + ' ' + num;
    if (street) return street;
    return '';
  }

  function statusRank(status) {
    // Lagre tal = visas hogre upp. "unknown" grupperas med "closed", se antagande #1 ovan.
    if (status === 'open') return 0;
    if (status === 'soon') return 1;
    if (status === 'unknown') return 2;
    return 3; // closed
  }

  function isHiddenByDefault(status) {
    return SOON_AND_OPEN_VISIBLE_BY_DEFAULT.indexOf(status) === -1;
  }

  // --- Rendering ---

  function renderChips() {
    els.chipRow.innerHTML = '';
    App.CATEGORIES.forEach(function (cat) {
      var style = App.CATEGORY_STYLE[cat.id] || {};
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip' + (cat.id === state.currentCategory ? ' active' : '');
      btn.dataset.cat = cat.id;
      btn.style.setProperty('--tint', style.tint);
      btn.style.setProperty('--mid', style.mid);
      btn.style.setProperty('--deep', style.deep);
      btn.innerHTML =
        '<span class="icon" aria-hidden="true">' +
        App.getIcon(cat.id) +
        '</span><span>' +
        App.t('categories.' + cat.id) +
        '</span>';
      btn.addEventListener('click', function () {
        if (state.currentCategory === cat.id) return;
        state.currentCategory = cat.id;
        renderChips();
        renderListCategory();
        loadPlaces();
      });
      els.chipRow.appendChild(btn);
    });
    updateChipFade();
  }

  function renderListCategory() {
    var style = App.CATEGORY_STYLE[state.currentCategory] || {};
    els.listCategory.style.setProperty('--tint', style.tint);
    els.listCategory.style.setProperty('--deep', style.deep);
    els.listCategory.innerHTML =
      '<span class="icon" aria-hidden="true">' +
      App.getIcon(state.currentCategory) +
      '</span><span>' +
      App.t('categories.' + state.currentCategory) +
      '</span>';
  }

  // Visar/dolar gradient-antydan i kategori-radens hogerkant beroende pa om det finns mer
  // att scrolla till - inte bara en statisk dekoration, se HANDOVER.md "Kategori-rad".
  function updateChipFade() {
    var el = els.chipRow;
    var atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    els.chipRowFade.style.opacity = atEnd ? '0' : '1';
  }

  function renderLangSelect() {
    if (els.langSelect.options.length === 0) {
      App.SUPPORTED_LANGUAGES.forEach(function (lang) {
        var opt = document.createElement('option');
        opt.value = lang;
        opt.textContent = App.LANGUAGE_NAMES[lang] || lang;
        els.langSelect.appendChild(opt);
      });
    }
    els.langSelect.value = App.currentLang;
  }

  function renderAll() {
    renderChips();
    renderHeader();
    renderLangSelect();
    renderListCategory();
    renderList();
  }

  function renderHeader() {
    els.locationIcon.innerHTML = App.getIcon('location-pin');
    els.refreshIcon.innerHTML = App.getIcon('refresh');
    if (state.userCoords) {
      els.locationText.textContent = App.t('ui.nearYou');
    } else if (state.locationErrorCode === 1) {
      els.locationText.textContent = App.t('ui.locationDenied');
    } else {
      els.locationText.textContent = App.t('ui.locationFallback');
    }
    els.refreshBtn.setAttribute('aria-label', App.t('ui.updateLocation'));
  }

  function renderToggle() {
    var closedCount = state.places.filter(function (p) {
      return isHiddenByDefault(p.status.status);
    }).length;
    els.toggleIcon.innerHTML = App.getIcon('chevron-down');
    els.toggleBtn.setAttribute('aria-pressed', String(state.showClosed));
    els.toggleLabel.textContent = state.showClosed
      ? App.t('ui.hideClosed')
      : App.t('ui.showClosed') + ' (' + closedCount + ')';
    els.toggleBtn.style.visibility = closedCount > 0 ? 'visible' : 'hidden';
  }

  function renderLoading() {
    els.content.innerHTML =
      '<div class="state-message"><div class="spinner" aria-hidden="true"></div>' +
      escapeHtml(App.t('ui.loadingPlaces')) +
      '</div>';
  }

  function renderError() {
    els.content.innerHTML =
      '<div class="state-message">' +
      escapeHtml(App.t('ui.fetchError')) +
      '<br><button type="button" id="retryBtn">' +
      escapeHtml(App.t('ui.retry')) +
      '</button></div>';
    document.getElementById('retryBtn').addEventListener('click', loadPlaces);
  }

  function renderList() {
    var visible = state.places.filter(function (p) {
      return state.showClosed || !isHiddenByDefault(p.status.status);
    });

    if (visible.length === 0) {
      els.content.innerHTML = '<div class="state-message">' + escapeHtml(App.t('ui.noResults')) + '</div>';
      renderToggle();
      return;
    }

    var html = '<div class="place-list">';
    visible.forEach(function (p) {
      html += placeCardHtml(p);
    });
    html += '</div>';
    els.content.innerHTML = html;

    visible.forEach(function (p) {
      var btn = document.getElementById('dir-' + cssEscape(p.id));
      if (btn) {
        btn.addEventListener('click', function () {
          window.open(
            'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destinationParam(p)),
            '_blank',
            'noopener'
          );
        });
      }
    });

    renderToggle();
  }

  function destinationParam(p) {
    // Exakt nod -> koordinaten gar att lita pa. Annars (way/relation-centroid, kan hamna fel
    // for stora omraden som ett sjukhus) -> latt Google soka pa namn+adress istallet, om vi
    // har nagot att soka pa. Se HANDOVER.md "Vagvisningens tillforlitlighet".
    if (p.precise || !p.name) {
      return p.lat + ',' + p.lon;
    }
    var parts = [p.name];
    var address = formatAddress(p.tags);
    if (address) parts.push(address);
    parts.push('Mallorca');
    return parts.join(', ');
  }

  function placeCardHtml(p) {
    var statusKey = p.status.status;
    var hidden = isHiddenByDefault(statusKey);
    var name = p.name || App.t('categories.' + p.category);

    // Avstånd FÖRST i metaraden - en lång adress får trunkeras av "...", aldrig avståndet.
    // (Detta var en riktig bugg tidigare: adress+avstånd i den ordningen kunde klippa bort
    // avståndet helt på rader med text-overflow:ellipsis. Se HANDOVER.md.)
    var metaParts = [];
    if (p.distance != null) metaParts.push(formatDistance(p.distance));
    var address = formatAddress(p.tags);
    if (address) metaParts.push(address);

    var topHtml;
    if (statusKey === 'open') {
      // Öppet är redan standardantagandet i vyn (stängt/okänt är dolda) - en upprepad
      // textetikett på varje kort tillför inget. En liten prick räcker.
      topHtml =
        '<div class="place-name-row"><span class="status-dot" aria-hidden="true"></span>' +
        '<p class="place-name">' +
        escapeHtml(name) +
        '</p></div>';
    } else {
      var badgeText =
        statusKey === 'soon' && p.status.minutesLeft != null
          ? App.t('ui.closingInMinutes').replace('{min}', p.status.minutesLeft)
          : App.t('status.' + statusKey);
      topHtml =
        '<span class="status-badge ' +
        statusKey +
        '">' +
        escapeHtml(badgeText) +
        '</span>' +
        '<p class="place-name with-badge">' +
        escapeHtml(name) +
        '</p>';
    }

    var directionsBtn = '';
    if (!hidden) {
      directionsBtn =
        '<button type="button" class="place-directions-btn" id="dir-' +
        cssEscape(p.id) +
        '" aria-label="' +
        escapeHtml(App.t('ui.directionsTo').replace('{name}', name)) +
        '"><span class="icon" aria-hidden="true">' +
        App.getIcon('directions') +
        '</span></button>';
    }

    return (
      '<div class="place-card' +
      (hidden ? ' is-closed' : '') +
      '">' +
      '<div class="place-body">' +
      topHtml +
      '<p class="place-meta">' +
      escapeHtml(metaParts.join(' · ')) +
      '</p>' +
      '</div>' +
      directionsBtn +
      '</div>'
    );
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // id:n fran OSM ("node/1001") innehaller "/" - ogiltigt i ett HTML-id rakt av i alla
  // sammanhang, ersatt med "-" for att vara pa den sakra sidan.
  function cssEscape(id) {
    return String(id).replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  // --- Datahämtning ---

  function loadPlaces() {
    renderLoading();
    var bbox = currentBbox();
    App.fetchPlaces([state.currentCategory], bbox)
      .then(function (places) {
        state.places = places
          .filter(function (p) {
            return p.category === state.currentCategory;
          })
          .map(function (p) {
            var status = App.getPlaceStatus(p.tags, p.category);
            var distance = state.userCoords
              ? distanceMeters(state.userCoords.lat, state.userCoords.lon, p.lat, p.lon)
              : null;
            return Object.assign({}, p, { status: status, distance: distance });
          })
          .sort(function (a, b) {
            var rankDiff = statusRank(a.status.status) - statusRank(b.status.status);
            if (rankDiff !== 0) return rankDiff;
            if (a.distance != null && b.distance != null) return a.distance - b.distance;
            return 0;
          });
        renderList();
      })
      .catch(function () {
        renderError();
      });
  }

  // --- Geolocation ---

  function requestLocation() {
    if (!('geolocation' in navigator)) {
      state.locationErrorCode = null;
      renderHeader();
      loadPlaces();
      return;
    }
    els.refreshBtn.classList.add('spinning');
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        state.userCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        state.locationErrorCode = null;
        els.refreshBtn.classList.remove('spinning');
        renderHeader();
        loadPlaces();
      },
      function (err) {
        // Loggas for framtida felsokning - kan inte se konsolen pa en riktig telefon, men
        // kostar inget och hjalper om nagon nansin tittar (t.ex. via skarmdump av devtools).
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('Geolocation-fel:', err && err.code, err && err.message);
        }
        state.userCoords = null;
        // code 1 = PERMISSION_DENIED - den enda av de tre felen anvandaren faktiskt kan
        // atgarda sjalv (installningar). 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT, hanteras
        // fortfarande lika eftersom de inte ar nagot anvandaren kan gora at direkt.
        state.locationErrorCode = err ? err.code : null;
        els.refreshBtn.classList.remove('spinning');
        renderHeader();
        loadPlaces();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }

  // --- Init ---

  var initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    els.locationIcon = document.getElementById('locationIcon');
    els.locationText = document.getElementById('locationText');
    els.langSelect = document.getElementById('langSelect');
    els.refreshBtn = document.getElementById('refreshBtn');
    els.refreshIcon = document.getElementById('refreshIcon');
    els.chipRow = document.getElementById('chipRow');
    els.chipRowFade = document.getElementById('chipRowFade');
    els.listCategory = document.getElementById('listCategory');
    els.toggleBtn = document.getElementById('toggleClosedBtn');
    els.toggleIcon = document.getElementById('toggleIcon');
    els.toggleLabel = document.getElementById('toggleLabel');
    els.content = document.getElementById('content');

    document.documentElement.lang = App.currentLang;

    renderChips();
    renderHeader();
    renderLangSelect();
    renderListCategory();
    renderToggle();

    els.chipRow.addEventListener('scroll', updateChipFade);
    els.refreshBtn.addEventListener('click', requestLocation);
    els.toggleBtn.addEventListener('click', function () {
      state.showClosed = !state.showClosed;
      renderList();
    });
    els.langSelect.addEventListener('change', function () {
      App.setLanguage(els.langSelect.value);
      document.documentElement.lang = App.currentLang;
      renderAll();
    });

    requestLocation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exponerat for test/run-tests.js (jsdom) - inte anvant av sidan sjalv.
  App._internal = {
    distanceMeters: distanceMeters,
    formatDistance: formatDistance,
    formatAddress: formatAddress,
    destinationParam: destinationParam,
    placeCardHtml: placeCardHtml,
    statusRank: statusRank,
    isHiddenByDefault: isHiddenByDefault,
    state: state
  };
})(typeof window !== 'undefined' ? window : globalThis);
