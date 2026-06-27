// Rev: 2026-06-21 — Initial Overpass-klient. Bygger EN sammanslagen fråga för flera
// kategorier i samma nätverksanrop (se DEV_PRINCIPLES/HANDOVER för varför), och klassificerar
// varje träff mot CATEGORIES_BY_ID-konfigurationen i efterhand snarare än att lita på
// Overpass att gruppera åt oss.
//
// Kan INTE testas mot den riktiga overpass-api.de från detta utvecklingsläge (sandlådans
// nätverk tillåter inte den domänen) — se HANDOVER.md "Kända begränsningar". Verifierad här
// mot en handskriven exempel-JSON som efterliknar ett verkligt Overpass-svar (test/).
// Riktig verifiering sker första gången sidan körs i en webbläsare med fullt nätverk.

(function (root) {
  'use strict';
  root.App = root.App || {};

  var OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

  function buildQuery(categoryIds, bbox) {
    // bbox = { south, west, north, east }
    var bboxStr = [bbox.south, bbox.west, bbox.north, bbox.east].join(',');
    var clauses = [];

    categoryIds.forEach(function (id) {
      var cat = root.App.CATEGORIES_BY_ID[id];
      if (!cat) return;
      cat.queries.forEach(function (andTags) {
        var filterStr = andTags
          .map(function (t) {
            return '["' + t.k + '"="' + t.v + '"]';
          })
          .join('');
        clauses.push('node' + filterStr + '(' + bboxStr + ');');
        clauses.push('way' + filterStr + '(' + bboxStr + ');');
      });
    });

    return '[out:json][timeout:25];\n(\n  ' + clauses.join('\n  ') + '\n);\nout center;';
  }

  function classifyCategory(tags) {
    var categories = root.App.CATEGORIES;
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      for (var j = 0; j < cat.queries.length; j++) {
        var andTags = cat.queries[j];
        var allMatch = andTags.every(function (t) {
          return tags && tags[t.k] === t.v;
        });
        if (allMatch) return cat.id;
      }
    }
    return null;
  }

  function normalizeElement(el) {
    var lat = el.lat != null ? el.lat : el.center ? el.center.lat : null;
    var lon = el.lon != null ? el.lon : el.center ? el.center.lon : null;
    var tags = el.tags || {};
    return {
      id: el.type + '/' + el.id,
      name: tags.name || null,
      lat: lat,
      lon: lon,
      category: classifyCategory(tags),
      tags: tags
    };
  }

  function fetchPlaces(categoryIds, bbox) {
    var query = buildQuery(categoryIds, bbox);
    return fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Overpass svarade med status ' + res.status);
        return res.json();
      })
      .then(function (json) {
        return (json.elements || [])
          .map(normalizeElement)
          .filter(function (p) {
            return p.lat != null && p.lon != null;
          });
      });
  }

  root.App.buildOverpassQuery = buildQuery;
  root.App.classifyCategory = classifyCategory;
  root.App.normalizeElement = normalizeElement;
  root.App.fetchPlaces = fetchPlaces;
})(typeof window !== 'undefined' ? window : globalThis);
