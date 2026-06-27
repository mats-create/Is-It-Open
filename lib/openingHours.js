// Rev: 2026-06-21 — Initial wrapper. Verified empirically (Node-test, se HANDOVER.md) att
// biblioteket returnerar strängen "close" (inte "closed") för aktuellt stängt-läge när man
// frågar om NUET (past-parametern utelämnad) — "closed" används bara vid past=true. Det är
// lätt att missa och skulle annars ge fel status här, så det hanteras explicit nedan.
//
// Status-betydelse i denna app:
//   'open'    -> öppet nu, gott om tid till stängning.
//   'soon'    -> öppet nu, men stänger inom SOON_THRESHOLD_MINUTES.
//   'closed'  -> stängt nu (men opening_hours-taggen finns och kunde tolkas).
//   'unknown' -> opening_hours saknas/går inte att tolka. Visas ALDRIG som öppet eller stängt.

(function (root) {
  'use strict';
  root.App = root.App || {};

  var SOON_THRESHOLD_MINUTES = 30;

  function getPlaceStatus(tags, categoryId, now) {
    now = now || new Date();
    var value = tags && tags.opening_hours;

    if (!value) {
      return missingTagFallback(categoryId);
    }

    var OpeningHours = root.opening_hours;
    if (!OpeningHours) {
      return { status: 'unknown', nextChange: null, minutesLeft: null, reason: 'library-not-loaded' };
    }

    var oh;
    try {
      oh = new OpeningHours(value, null, { warnings_severity: 7 });
    } catch (e) {
      return { status: 'unknown', nextChange: null, minutesLeft: null, reason: 'parse-error', error: String((e && e.message) || e) };
    }

    var stateStr;
    var next;
    try {
      stateStr = oh.getStateString(now); // 'open' | 'close' | 'unknown'
      next = oh.getNextChange(now) || null;
    } catch (e) {
      return { status: 'unknown', nextChange: null, minutesLeft: null, reason: 'eval-error', error: String((e && e.message) || e) };
    }

    if (stateStr === 'unknown') {
      return { status: 'unknown', nextChange: next, minutesLeft: null };
    }

    if (stateStr === 'open') {
      if (next) {
        var minutesLeft = Math.round((next - now) / 60000);
        if (minutesLeft <= SOON_THRESHOLD_MINUTES) {
          return { status: 'soon', nextChange: next, minutesLeft: minutesLeft };
        }
        return { status: 'open', nextChange: next, minutesLeft: minutesLeft };
      }
      return { status: 'open', nextChange: null, minutesLeft: null }; // t.ex. 24/7
    }

    // stateStr === 'close' -> vår status 'closed'
    return { status: 'closed', nextChange: next, minutesLeft: null };
  }

  function missingTagFallback(categoryId) {
    var cfg = root.App.CATEGORIES_BY_ID && root.App.CATEGORIES_BY_ID[categoryId];
    var fallback = cfg ? cfg.missingHoursFallback : 'unknown';
    if (fallback === 'open') {
      return { status: 'open', nextChange: null, minutesLeft: null, assumed: true };
    }
    return { status: 'unknown', nextChange: null, minutesLeft: null };
  }

  root.App.getPlaceStatus = getPlaceStatus;
})(typeof window !== 'undefined' ? window : globalThis);
