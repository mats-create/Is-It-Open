// Rev: 2026-06-21 — Initial category list (snabbköp, supermarket, apotek, restauranger,
// sjukhus, kliniker, kommunhus, bibliotek, polis, post, återvinning, aktiviteter).
// OSM-taggar verifierade mot OpenStreetMap-wikin innan de skrevs in här (se HANDOVER.md).
//
// VIKTIGT (2026-06-21): "label" nedan är PLACEHOLDER på svenska bara. Appen ska stödja
// sv/en/de/fr/es (fler kan tillkomma) — se HANDOVER.md "Nytt krav". Bygg INTE UI direkt mot
// label-fälten här utan att först besluta var översättningarna ska bo (troligen en separat
// i18n-fil, inte denna fil) — annars måste UI-lagret skrivas om.
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
      label: 'Snabbköp',
      queries: [[{ k: 'shop', v: 'convenience' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'supermarket',
      label: 'Supermarket',
      queries: [[{ k: 'shop', v: 'supermarket' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'apotek',
      label: 'Apotek',
      queries: [[{ k: 'amenity', v: 'pharmacy' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'restauranger',
      label: 'Restauranger',
      queries: [[{ k: 'amenity', v: 'restaurant' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'sjukhus',
      label: 'Sjukhus',
      queries: [[{ k: 'amenity', v: 'hospital' }]],
      missingHoursFallback: 'open'
    },
    {
      id: 'kliniker',
      label: 'Kliniker',
      queries: [
        [{ k: 'amenity', v: 'clinic' }],
        [{ k: 'amenity', v: 'doctors' }]
      ],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'kommunhus',
      label: 'Kommunhus / medborgarkontor',
      queries: [
        [{ k: 'amenity', v: 'townhall' }],
        [{ k: 'office', v: 'government' }]
      ],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'bibliotek',
      label: 'Bibliotek',
      queries: [[{ k: 'amenity', v: 'library' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'polis',
      label: 'Polisstation',
      queries: [[{ k: 'amenity', v: 'police' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'post',
      label: 'Posttjänster',
      queries: [[{ k: 'amenity', v: 'post_office' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'atervinning',
      label: 'Återvinningsstationer',
      queries: [[{ k: 'amenity', v: 'recycling' }, { k: 'recycling_type', v: 'centre' }]],
      missingHoursFallback: 'unknown'
    },
    {
      id: 'aktiviteter',
      label: 'Lokala aktiviteter',
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
