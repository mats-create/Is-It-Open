// Rev: 2026-06-22 — Initial icon set. Egna enkla SVG-ikoner (linje-stil, viewBox 0 0 24 24,
// stroke="currentColor") istället för ett externt ikonfont-bibliotek — håller appen helt
// fristående utan extra nätverksberoende, vilket även gynnar det planerade offline-läget.
// Kvalitet: enkla, avsiktligt minimalistiska former. Inte visuellt korrekturlästa i en riktig
// webbläsare än (kan inte rendera/skärmdumpa SVG i den här sandlådan) — räkna med att vissa
// ikoner kan behöva finjusteras visuellt första gången de faktiskt syns i en webbläsare.

(function (root) {
  'use strict';
  root.App = root.App || {};

  var ICONS = {
    // UI
    'location-pin':
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-7.4-7-12a7 7 0 1 1 14 0c0 4.6-7 12-7 12z"/><circle cx="12" cy="9" r="2.3"/></svg>',
    refresh:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><polyline points="21 3 21 9 15 9"/></svg>',
    'chevron-down':
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    directions:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="8 7 17 7 17 16"/></svg>',

    // Kategorier
    snabbkop:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12a1.5 1.5 0 0 1-1.5 1.3h-7a1.5 1.5 0 0 1-1.5-1.3L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    supermarket:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>',
    apotek:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    restauranger:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="2" x2="6" y2="10"/><line x1="8" y1="2" x2="8" y2="10"/><line x1="6" y1="10" x2="8" y2="10"/><line x1="7" y1="10" x2="7" y2="22"/><path d="M17 2v8a2 2 0 0 1-2 2"/><line x1="17" y1="2" x2="17" y2="22"/></svg>',
    sjukhus:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="4" x2="7" y2="20"/><line x1="17" y1="4" x2="17" y2="20"/><line x1="7" y1="12" x2="17" y2="12"/></svg>',
    kliniker:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M5 11h3l1.5-3 2 5 1.5-3h4.5"/></svg>',
    kommunhus:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-5 9 5"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="6" y1="9" x2="6" y2="18"/><line x1="10" y1="9" x2="10" y2="18"/><line x1="14" y1="9" x2="14" y2="18"/><line x1="18" y1="9" x2="18" y2="18"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    bibliotek:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6c-2-1.5-5-2-9-1v13c4-1 7-0.5 9 1V6z"/><path d="M12 6c2-1.5 5-2 9-1v13c-4-1-7-0.5-9 1V6z"/></svg>',
    polis:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z"/></svg>',
    post:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 14 21 7"/></svg>',
    atervinning:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1.2 12.5a2 2 0 0 1-2 1.5H9.2a2 2 0 0 1-2-1.5L6 8z"/><line x1="4" y1="8" x2="20" y2="8"/><path d="M10 8V6a2 2 0 0 1 4 0v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    aktiviteter:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="2.3"/><path d="M5 19v-2a4 4 0 0 1 4-4 4 4 0 0 1 4 4v2"/><circle cx="17" cy="8.5" r="1.8"/><path d="M13.6 19v-1.6a3.2 3.2 0 0 1 6.4 0V19"/></svg>'
  };

  root.App.ICONS = ICONS;
  root.App.getIcon = function (name) {
    return ICONS[name] || '';
  };

  // Färgkluster per kategori (samma hex-värden som redan visats och godkänts i mockuperna).
  // tint = ljus bakgrund (chip/swatch), mid = mättad (vald chip-bakgrund), deep = mörk (ikon/text).
  // Grupperat tematiskt istället för 12 helt unika färger - skiljs åt med ikon inom klustret.
  // Medvetet INTE grönt/gult/grått - de är reserverade för statusfärgerna (öppet/snart/stängt).
  var CORAL = { tint: '#FAECE7', mid: '#993C1D', deep: '#712B13' };
  var TEAL = { tint: '#E1F5EE', mid: '#0F6E56', deep: '#085041' };
  var PINK = { tint: '#FBEAF0', mid: '#993556', deep: '#72243E' };
  var PURPLE = { tint: '#EEEDFE', mid: '#534AB7', deep: '#3C3489' };
  var INDIGO = { tint: '#EEF0FB', mid: '#4B53A6', deep: '#343B78' };

  root.App.CATEGORY_STYLE = {
    snabbkop: CORAL,
    supermarket: TEAL,
    apotek: PINK,
    restauranger: PURPLE,
    sjukhus: PINK,
    kliniker: PINK,
    kommunhus: INDIGO,
    bibliotek: INDIGO,
    polis: INDIGO,
    post: INDIGO,
    atervinning: TEAL,
    aktiviteter: INDIGO
  };
})(typeof window !== 'undefined' ? window : globalThis);
