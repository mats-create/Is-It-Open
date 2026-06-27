// Rev: 2026-06-22 — Initial i18n-lager. Alla UI-strängar bor här, INTE i categories.js
// ("label" togs bort från categories.js i samma ändring — categories.js är nu rent datalager).
//
// Konvention för antal (t.ex. "X stängda platser"): bygg ALDRIG en grammatiskt böjd
// flertalsform i kod — plural-/genusböjning skiljer sig för mycket mellan sv/en/de/fr/es.
// Lägg siffran i en parentes efter en oböjlig fras istället, i UI-koden:
//   t('ui.showClosed') + ' (' + n + ')'   ->  "Visa stängda (3)" / "Show closed (3)" osv.
//
// Konvention för platsnamn: nycklar med {name} (t.ex. ui.directionsTo) ska få {name}
// ersatt av anroparen med det RIKTIGA OSM-namnet. Platsnamn (t.ex. "Es Racó") ska ALDRIG
// översättas eller bytas ut mot en annan språkversion — de är egennamn.
//
// Om en nyckel saknas för ett språk faller t() tillbaka på engelska (se längst ner i filen).
// Alla fem språk är just nu fullt ifyllda; fallbacken är ett skyddsnät, inte en permanent plan.

(function (root) {
  'use strict';
  root.App = root.App || {};

  var I18N = {
    sv: {
      categories: {
        snabbkop: 'Snabbköp',
        supermarket: 'Supermarket',
        apotek: 'Apotek',
        restauranger: 'Restauranger',
        sjukhus: 'Sjukhus',
        kliniker: 'Kliniker',
        kommunhus: 'Kommunhus / medborgarkontor',
        bibliotek: 'Bibliotek',
        polis: 'Polisstation',
        post: 'Posttjänster',
        atervinning: 'Återvinningsstationer',
        aktiviteter: 'Lokala aktiviteter'
      },
      status: {
        open: 'Öppet',
        soon: 'Stänger snart',
        closed: 'Stängt',
        unknown: 'Öppettider okända'
      },
      ui: {
        updateLocation: 'Uppdatera plats',
        showClosed: 'Visa stängda',
        hideClosed: 'Dölj stängda',
        directionsTo: 'Vägvisning till {name}',
        nearYou: 'Nära dig',
        locationFallback: 'Mallorca (hela ön)',
        loadingPlaces: 'Söker platser…',
        fetchError: 'Kunde inte hämta platser. Kontrollera internetanslutningen.',
        retry: 'Försök igen',
        noResults: 'Inga platser hittades i den här kategorin nära dig.'
      }
    },
    en: {
      categories: {
        snabbkop: 'Convenience store',
        supermarket: 'Supermarket',
        apotek: 'Pharmacy',
        restauranger: 'Restaurants',
        sjukhus: 'Hospital',
        kliniker: 'Clinics',
        kommunhus: 'Town hall / civic office',
        bibliotek: 'Library',
        polis: 'Police station',
        post: 'Post office',
        atervinning: 'Recycling centres',
        aktiviteter: 'Community centres'
      },
      status: {
        open: 'Open',
        soon: 'Closing soon',
        closed: 'Closed',
        unknown: 'Hours unknown'
      },
      ui: {
        updateLocation: 'Update location',
        showClosed: 'Show closed',
        hideClosed: 'Hide closed',
        directionsTo: 'Directions to {name}',
        nearYou: 'Near you',
        locationFallback: 'Mallorca (whole island)',
        loadingPlaces: 'Finding places…',
        fetchError: "Couldn't load places. Check your internet connection.",
        retry: 'Try again',
        noResults: 'No places found in this category near you.'
      }
    },
    de: {
      categories: {
        snabbkop: 'Nachbarschaftsladen',
        supermarket: 'Supermarkt',
        apotek: 'Apotheke',
        restauranger: 'Restaurants',
        sjukhus: 'Krankenhaus',
        kliniker: 'Kliniken',
        kommunhus: 'Rathaus / Bürgerbüro',
        bibliotek: 'Bibliothek',
        polis: 'Polizeiwache',
        post: 'Postfiliale',
        atervinning: 'Wertstoffhöfe',
        aktiviteter: 'Bürgerhäuser'
      },
      status: {
        open: 'Geöffnet',
        soon: 'Schließt bald',
        closed: 'Geschlossen',
        unknown: 'Öffnungszeiten unbekannt'
      },
      ui: {
        updateLocation: 'Standort aktualisieren',
        showClosed: 'Geschlossene anzeigen',
        hideClosed: 'Geschlossene ausblenden',
        directionsTo: 'Wegbeschreibung zu {name}',
        nearYou: 'In deiner Nähe',
        locationFallback: 'Mallorca (ganze Insel)',
        loadingPlaces: 'Orte werden gesucht…',
        fetchError: 'Orte konnten nicht geladen werden. Internetverbindung prüfen.',
        retry: 'Erneut versuchen',
        noResults: 'Keine Orte in dieser Kategorie in deiner Nähe gefunden.'
      }
    },
    fr: {
      categories: {
        snabbkop: 'Supérette',
        supermarket: 'Supermarché',
        apotek: 'Pharmacie',
        restauranger: 'Restaurants',
        sjukhus: 'Hôpital',
        kliniker: 'Cliniques',
        kommunhus: 'Mairie / bureau citoyen',
        bibliotek: 'Bibliothèque',
        polis: 'Commissariat',
        post: 'Bureau de poste',
        atervinning: 'Déchetteries',
        aktiviteter: 'Maisons de quartier'
      },
      status: {
        open: 'Ouvert',
        soon: 'Ferme bientôt',
        closed: 'Fermé',
        unknown: 'Horaires inconnus'
      },
      ui: {
        updateLocation: 'Actualiser la position',
        showClosed: 'Afficher les fermés',
        hideClosed: 'Masquer les fermés',
        directionsTo: 'Itinéraire vers {name}',
        nearYou: 'Près de vous',
        locationFallback: 'Majorque (île entière)',
        loadingPlaces: 'Recherche des lieux…',
        fetchError: 'Impossible de charger les lieux. Vérifiez votre connexion internet.',
        retry: 'Réessayer',
        noResults: 'Aucun lieu trouvé dans cette catégorie près de vous.'
      }
    },
    es: {
      categories: {
        snabbkop: 'Tienda de conveniencia',
        supermarket: 'Supermercado',
        apotek: 'Farmacia',
        restauranger: 'Restaurantes',
        sjukhus: 'Hospital',
        kliniker: 'Clínicas',
        kommunhus: 'Ayuntamiento / oficina de atención ciudadana',
        bibliotek: 'Biblioteca',
        polis: 'Comisaría',
        post: 'Oficina de correos',
        atervinning: 'Puntos limpios',
        aktiviteter: 'Centros cívicos'
      },
      status: {
        open: 'Abierto',
        soon: 'Cierra pronto',
        closed: 'Cerrado',
        unknown: 'Horario desconocido'
      },
      ui: {
        updateLocation: 'Actualizar ubicación',
        showClosed: 'Mostrar cerrados',
        hideClosed: 'Ocultar cerrados',
        directionsTo: 'Cómo llegar a {name}',
        nearYou: 'Cerca de ti',
        locationFallback: 'Mallorca (toda la isla)',
        loadingPlaces: 'Buscando lugares…',
        fetchError: 'No se pudieron cargar los lugares. Comprueba tu conexión a internet.',
        retry: 'Reintentar',
        noResults: 'No se encontraron lugares de esta categoría cerca de ti.'
      }
    }
  };

  var SUPPORTED_LANGUAGES = ['sv', 'en', 'de', 'fr', 'es'];
  var FALLBACK_LANG = 'en';
  var STORAGE_KEY = 'oppetnu_lang';

  function detectLanguage() {
    var stored = null;
    try {
      stored = root.localStorage ? root.localStorage.getItem(STORAGE_KEY) : null;
    } catch (e) {
      stored = null; // t.ex. localStorage avstängt i privat läge - falla tillbaka, krascha inte
    }
    if (stored && SUPPORTED_LANGUAGES.indexOf(stored) !== -1) {
      return stored;
    }

    var navLangs = (root.navigator && (root.navigator.languages || [root.navigator.language])) || [];
    for (var i = 0; i < navLangs.length; i++) {
      var code = String(navLangs[i]).slice(0, 2).toLowerCase();
      if (SUPPORTED_LANGUAGES.indexOf(code) !== -1) {
        return code;
      }
    }
    return FALLBACK_LANG;
  }

  function setLanguage(lang) {
    if (SUPPORTED_LANGUAGES.indexOf(lang) === -1) return false;
    root.App.currentLang = lang;
    try {
      if (root.localStorage) root.localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // ignorera - språkvalet gäller bara denna session istället för att sparas
    }
    return true;
  }

  function lookup(langObj, parts) {
    var cur = langObj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return null;
      cur = cur[parts[i]];
    }
    return cur != null ? cur : null;
  }

  // t('categories.apotek') / t('status.open') / t('ui.showClosed')
  function t(path) {
    var parts = path.split('.');
    var lang = root.App.currentLang || FALLBACK_LANG;
    var hit = lookup(I18N[lang], parts);
    if (hit != null) return hit;
    var fallbackHit = lookup(I18N[FALLBACK_LANG], parts);
    return fallbackHit != null ? fallbackHit : path;
  }

  root.App.I18N = I18N;
  root.App.SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;
  root.App.FALLBACK_LANG = FALLBACK_LANG;
  root.App.currentLang = detectLanguage();
  root.App.setLanguage = setLanguage;
  root.App.t = t;
})(typeof window !== 'undefined' ? window : globalThis);
