/**
 * Shared helpers for all GlowStat cards: temperature color scale,
 * translations, escaping and small DOM utilities.
 */

/** Temperature color stops in °C: [temperature, [r, g, b]]. */
const GS_STOPS = [
  [-10, [92, 146, 255]],
  [8, [0, 213, 255]],
  [20, [0, 168, 28]],
  [22, [0, 168, 28]],
  [30, [255, 174, 0]],
  [38, [255, 0, 0]],
];

/**
 * Color stops with a configurable comfort range: the green plateau runs from `cmin` to `cmax`
 * (°C), the cold and hot stops move with it so the stops always stay in ascending order.
 * @param {number} [cmin] Lower end of the comfort range (default 20).
 * @param {number} [cmax] Upper end of the comfort range (default 22).
 * @returns {Array} Stops in the GS_STOPS format.
 */
function gsStops(cmin, cmax) {
  const lo = Number.isFinite(Number(cmin)) && cmin !== undefined && cmin !== null ? Number(cmin) : 20;
  let hi = Number.isFinite(Number(cmax)) && cmax !== undefined && cmax !== null ? Number(cmax) : 22;
  if (hi < lo) hi = lo;
  return [
    [-10, GS_STOPS[0][1]],
    [Math.min(8, lo - 2), GS_STOPS[1][1]],
    [lo, GS_STOPS[2][1]],
    [hi, GS_STOPS[3][1]],
    [Math.max(30, hi + 2), GS_STOPS[4][1]],
    [Math.max(38, hi + 10), GS_STOPS[5][1]],
  ];
}

/**
 * Interpolated RGB color for a temperature in °C.
 * @param {number} celsius Temperature in °C (NaN gives neutral gray).
 * @param {Array} [stops] Color stops, defaults to GS_STOPS.
 * @returns {number[]} [r, g, b]
 */
function gsColor(celsius, stops) {
  if (isNaN(celsius)) return [150, 150, 150];
  const S = stops || GS_STOPS;
  if (celsius <= S[0][0]) return S[0][1];
  if (celsius >= S[S.length - 1][0]) return S[S.length - 1][1];
  for (let i = 0; i < S.length - 1; i++) {
    if (celsius >= S[i][0] && celsius <= S[i + 1][0]) {
      const f = (celsius - S[i][0]) / (S[i + 1][0] - S[i][0]);
      return S[i][1].map((x, k) => Math.round(x + (S[i + 1][1][k] - x) * f));
    }
  }
  return [150, 150, 150];
}

/** Translations. Add a language by adding a block; English is the fallback. */
const GS_I18N = {
  en: {
    hot: 'Hot',
    warm: 'Warm',
    pleasant: 'Pleasantly warm',
    comfortable: 'Comfortable',
    cool: 'Cool',
    cold: 'Cold',
    freezing: 'Freezing',
    no_data: 'No data',
    loading: 'loading…',
    not_enough: 'not enough data',
    hours: 'h',
    entity: 'Temperature sensor',
    name: 'Name',
    humidity_entity: 'Humidity sensor (optional)',
    battery_entity: 'Battery sensor (optional)',
    show_sparkline: 'Show history graph',
    history_hours: 'History length (hours)',
    show_background_emoji: 'Show background emoji',
    language: 'Language',
    show_trend: 'Show trend arrow',
    show_dew_point: 'Show dew point',
    mold_humidity: 'Mold warning from humidity (%)',
    comfort_min: 'Comfort range from (°C)',
    comfort_max: 'Comfort range to (°C)',
    trend_hour: 'change in the last hour',
    dew_point: 'Dew point',
    mold_risk: 'Mold risk',
    language_auto: 'Automatic (Home Assistant)',
    language_hu: 'Magyar',
    language_en: 'English',
  },
  hu: {
    hot: 'Forró',
    warm: 'Meleg',
    pleasant: 'Kellemesen meleg',
    comfortable: 'Komfortos',
    cool: 'Hűvös',
    cold: 'Hideg',
    freezing: 'Fagyos',
    no_data: 'Nincs adat',
    loading: 'betöltés…',
    not_enough: 'nincs elég adat',
    hours: 'óra',
    entity: 'Hőmérséklet szenzor',
    name: 'Név',
    humidity_entity: 'Páratartalom szenzor (opcionális)',
    battery_entity: 'Elem szenzor (opcionális)',
    show_sparkline: 'Előzmény grafikon megjelenítése',
    history_hours: 'Előzmény hossza (óra)',
    show_background_emoji: 'Háttér emoji megjelenítése',
    language: 'Nyelv',
    show_trend: 'Trendnyíl megjelenítése',
    show_dew_point: 'Harmatpont megjelenítése',
    mold_humidity: 'Penészfigyelmeztetés páratartalomtól (%)',
    comfort_min: 'Komfortzóna alsó határa (°C)',
    comfort_max: 'Komfortzóna felső határa (°C)',
    trend_hour: 'változás az elmúlt órában',
    dew_point: 'Harmatpont',
    mold_risk: 'Penészveszély',
    language_auto: 'Automatikus (Home Assistant)',
    language_hu: 'Magyar',
    language_en: 'English',
  },
};

/**
 * Language object for a card: the card's own `language` setting wins over the
 * Home Assistant UI language. The result can be passed to gsT() and gsNum().
 * @param {object} hass Home Assistant object (may be undefined early on).
 * @param {object} cfg Card configuration (may be undefined early on).
 * @returns {{language: string, locale: {language: string}}}
 */
function gsLangObj(hass, cfg) {
  const own = cfg && cfg.language && cfg.language !== 'auto' ? cfg.language : null;
  const lang = own || (hass && hass.language) || 'en';
  return { language: lang, locale: { language: lang } };
}

/**
 * Translate a key using the Home Assistant UI language.
 * @param {object} hass Home Assistant object.
 * @param {string} key Translation key.
 * @returns {string}
 */
function gsT(hass, key) {
  const lang = ((hass && hass.language) || 'en').split('-')[0];
  return (GS_I18N[lang] && GS_I18N[lang][key]) || GS_I18N.en[key] || key;
}

/**
 * Escape a string for safe use inside HTML text or attribute values.
 * @param {*} value Any value.
 * @returns {string}
 */
function gsEsc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

/**
 * Replace the content of a node with parsed markup. Parsing goes through
 * DOMParser, so no script can run; every dynamic value passed in by the cards
 * is escaped with gsEsc() or is a number.
 * @param {ParentNode} root Target node (e.g. a shadow root).
 * @param {string} html Markup to render.
 */
function gsSetHtml(root, html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  root.replaceChildren(...doc.head.childNodes, ...doc.body.childNodes);
}

/**
 * Dispatch a Home Assistant style custom event.
 * @param {HTMLElement} node Event source.
 * @param {string} type Event type.
 * @param {object} detail Event detail.
 */
function gsFire(node, type, detail) {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

/**
 * Format a number with the user's locale and fixed decimals.
 * @param {object} hass Home Assistant object.
 * @param {number} value Number to format.
 * @param {number} decimals Fraction digits.
 * @returns {string}
 */
function gsNum(hass, value, decimals) {
  const lang = (hass && ((hass.locale && hass.locale.language) || hass.language)) || 'en';
  return value.toLocaleString(lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Register a card in the Home Assistant card picker. */
function gsRegisterCard(info) {
  window.customCards = window.customCards || [];
  window.customCards.push({ preview: true, ...info });
}

/** Schema entry and helper for the shared language selector in the editors. */
function gsLanguageField(hass) {
  return {
    name: 'language',
    selector: {
      select: {
        mode: 'dropdown',
        options: ['auto', 'hu', 'en'].map((v) => ({ value: v, label: gsT(hass, 'language_' + v) })),
      },
    },
  };
}
