// Rev: 2026-06-22 — "label" borttaget. Etiketter bor nu i data/i18n.js (categories.<id>),
// eftersom appen ska stödja sv/en/de/fr/es. Denna fil är nu rent datalager: id, queries,
// missingHoursFallback. Lägg ALDRIG tillbaka en visningstext här — det skulle återskapa
// samma problem (en hårdkodad språkversion) som vi just löste.
//
// OSM-taggar verifierade mot OpenStreetMap-wikin innan de skrevs in här (se HANDOVER.md).
//
// "queries" är en lista av OR-villkor. Varje OR-villkor är i sin tur en lista av
// AND-taggar som alla måste matcha samma OSM-element. Exempel:
//   queries: [[{k:'amenity', v:'recycling'}, {k:'recycling_type', v:'centre'}]]
//   -> matchar element som har BÅDA amenity=recycling OCH recycling_type=centre.
//   queries: [[{k:'amenity', v:'clinic'}], [{k:'amenity', v:'doctors'}]]
//   -> matchar element som har amenity=clinic ELLER amenity=doctors.
//
// missingHoursFallback styr vad UI ska visa om opening_hours-taggen saknas helt:
//   'open'    -> antas öppet (används bara för sjukhus, som i praktiken ofta saknar
//                 taggen just därför att de är öppna dygnet runt).
//   'unknown' -> visas som "öppettider okända", aldrig som öppet eller stängt.
//
// Medvetet INTE med i v1 (kräver annan datakälla än OSM, se HANDOVER.md "Kända begränsningar"):
//   - Specifika ajuntament-ärenden (bygglov, folkbokföring, parkeringstillstånd, intyg, tomtplaner).
//   - Evenemangs-/aktivitetskalender (skiljer sig från fasta platser med öppettider).

(function (root) {
  'use strict';
  root.App = root.App || {};

  var CATEGORIES = [
    {
      id: 'snabbkop',
      queries: [[{ k: 'shop', v: 'convenience' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'supermarket',
      queries: [[{ k: 'shop', v: 'supermarket' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'apotek',
      queries: [[{ k: 'amenity', v: 'pharmacy' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'restauranger',
      queries: [[{ k: 'amenity', v: 'restaurant' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'sjukhus',
      queries: [[{ k: 'amenity', v: 'hospital' }]],
      missingHoursFallback: 'open'
    },
    {
      id: 'kliniker',
      queries: [
        [{ k: 'amenity', v: 'clinic' }],
        [{ k: 'amenity', v: 'doctors' }]
      ],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'kommunhus',
      queries: [
        [{ k: 'amenity', v: 'townhall' }],
        [{ k: 'office', v: 'government' }]
      ],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'bibliotek',
      queries: [[{ k: 'amenity', v: 'library' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'polis',
      queries: [[{ k: 'amenity', v: 'police' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'post',
      queries: [[{ k: 'amenity', v: 'post_office' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'atervinning',
      queries: [[{ k: 'amenity', v: 'recycling' }, { k: 'recycling_type', v: 'centre' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'aktiviteter',
      queries: [[{ k: 'amenity', v: 'community_centre' }]],
      missingHoursFallback: 'unknown'
    }
  ];

  var byId = {};
  CATEGORIES.forEach(function (c) {
    byId[c.id] = c;
  });

  root.App.CATEGORIES = CATEGORIES;
  root.App.CATEGORIES_BY_ID = byId;
})(typeof window !== 'undefined' ? window : globalThis);
