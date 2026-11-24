/* GlowStat v0.6.1 - MIT - https://github.com/forreggbor/ha-GlowStat */
(() => {
const GS_VERSION = '0.6.1';
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
/**
 * glowstat-thermometer-card: temperature card with state-colored glow,
 * humidity, battery, scale bar, history sparkline, trend arrow and an animated background emoji.
 */

/** History cache shared by all card instances, keyed by entity + hours. */
const GS_HIST = {};
const GS_LS_PREFIX = 'glowstat:hist:';
const GS_LS_MAX_AGE_MS = 6 * 3600 * 1000;
const GS_REFRESH_MS = 5 * 60 * 1000;
const GS_BUSY_TIMEOUT_MS = 30 * 1000;
/** Histories longer than this many hours come from the long-term statistics instead of the raw history. */
const GS_STATS_FROM_HOURS = 48;

const GS_THERMO_CSS = `
  :host { display: block; }
  ha-card { display: block; height: 100%; overflow: hidden; position: relative; cursor: pointer; container-type: inline-size; }
  [tabindex]:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 6px; }
  .card {
    position: relative; box-sizing: border-box; height: 100%; min-height: 176px; padding: 10px;
    display: grid; gap: 8px; align-items: center; align-content: space-between;
    grid-template-columns: auto 1fr auto;
    grid-template-areas: 'head head bat' 'temp spark hum' 'bar bar bar';
  }
  .card > * { position: relative; z-index: 1; }
  .card > .bgicon {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    pointer-events: none; z-index: 0; overflow: hidden;
  }
  .bgicon > div { font-size: 120px; line-height: 1; opacity: 0.15; }
  .head { grid-area: head; justify-self: start; text-align: left; }
  .name { font-weight: 600; font-size: 14px; }
  .word { font-size: 12px; }
  .bat { grid-area: bat; justify-self: end; align-self: start; display: flex; align-items: center; gap: 2px; font-size: 12px; font-weight: 500; }
  .temp { grid-area: temp; justify-self: start; font-size: 22px; font-weight: 400; line-height: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
  .temp small { font-size: 18px; }
  .trend { font-size: 11px; font-weight: 500; line-height: 1; }
  .hum { grid-area: hum; justify-self: end; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; font-weight: 400; }
  .hum .hv { display: flex; align-items: center; gap: 2px; font-size: 22px; line-height: 1; }
  .hum .hsub { font-size: 10px; font-weight: 500; line-height: 1; }
  ha-icon { --mdc-icon-size: 18px; }
  .hum ha-icon { --mdc-icon-size: 22px; }
  .spark { grid-area: spark; width: 100%; min-width: 0; justify-self: stretch; }
  .spark .msg { font-size: 10px; text-align: center; color: var(--secondary-text-color); }
  .spark .err { font-size: 10px; text-align: center; color: var(--error-color, #ef5350); }
  .spark .plot { position: relative; height: 40px; }
  .spark svg { width: 100%; height: 40px; display: block; overflow: visible; }
  .spark .dot { position: absolute; right: 0; width: 8px; height: 8px; border-radius: 50%; transform: translate(50%, -50%); }
  .spark .legend { display: flex; justify-content: space-between; margin-top: 2px; font-size: 10px; color: var(--secondary-text-color); }
  .bar { grid-area: bar; width: 100%; padding: 8px 8px 0 8px; box-sizing: border-box; }
  .bar .track { position: relative; height: 8px; border-radius: 4px; }
  .bar .marker {
    position: absolute; top: 50%; width: 14px; height: 14px; box-sizing: border-box;
    transform: translate(-50%, -50%); border-radius: 50%; background: #fff; border-width: 3px; border-style: solid;
  }
  .bar .scale { display: flex; justify-content: space-between; margin-top: 4px; font-size: 10px; color: var(--secondary-text-color); }
  @keyframes shiver { 0%,100% { transform: translateX(0) rotate(0) } 20% { transform: translateX(-4px) rotate(-5deg) } 40% { transform: translateX(4px) rotate(5deg) } 60% { transform: translateX(-4px) rotate(-4deg) } 80% { transform: translateX(4px) rotate(4deg) } }
  @keyframes waddle { 0%,100% { transform: rotate(-7deg) } 50% { transform: rotate(7deg) } }
  @keyframes bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
  @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.1) } }
  @media (prefers-reduced-motion: reduce) { .bgicon > div { animation: none !important; } }
  @container (max-width: 300px) {
    .card { min-height: 150px; padding: 8px; gap: 6px; }
    .temp, .hum .hv { font-size: 18px; }
    .temp small { font-size: 14px; }
    .spark .legend span:nth-child(2) { display: none; }
  }
`;

class GlowStatThermometerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._uid = 'gs' + Math.random().toString(36).slice(2, 8);
    this._sig = '';
    this._histKey = null;
    this._trendKey = null;
  }

  static getConfigElement() {
    return document.createElement('glowstat-thermometer-card-editor');
  }

  static getStubConfig(hass) {
    const states = (hass && hass.states) || {};
    const entity = Object.keys(states).find((id) => (
      id.startsWith('sensor.') && states[id].attributes.device_class === 'temperature'
    ));
    return { entity: entity || 'sensor.temperature' };
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('GlowStat: "entity" is required');
    }
    this._config = {
      show_sparkline: true,
      show_background_emoji: true,
      show_trend: true,
      history_hours: 24,
      ...config,
    };
    this._sig = '';
    this._unsubscribeHistory();
    this._paint();
  }

  set hass(hass) {
    this._hass = hass;
    const sig = this._signature();
    if (sig !== this._sig) {
      this._sig = sig;
      this._paint();
    }
    this._ensureHistory();
  }

  connectedCallback() {
    this._ensureHistory();
  }

  disconnectedCallback() {
    this._unsubscribeHistory();
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 12, rows: 'auto', min_columns: 4 };
  }

  /** Signature of everything that affects the rendering except history. */
  _signature() {
    if (!this._hass || !this._config) return '';
    const c = this._config;
    const ids = [c.entity, c.humidity_entity, c.battery_entity].filter(Boolean);
    const parts = ids.map((id) => {
      const s = this._hass.states[id];
      return s ? s.state + '/' + (s.attributes.unit_of_measurement || '') : '∅';
    });
    return parts.join('|') + '|' + gsLangObj(this._hass, this._config).language;
  }

  _unsubscribeHistory() {
    [this._histKey, this._trendKey].forEach((k) => {
      if (k && GS_HIST[k]) GS_HIST[k].subs.delete(this);
    });
    this._histKey = null;
    this._trendKey = null;
  }

  /** Load the history needed for the graph and the trend arrow; the caches are shared across cards. */
  _ensureHistory() {
    const c = this._config;
    const hass = this._hass;
    if (!c || !hass) return;
    const hours = Math.max(1, Number(c.history_hours) || 24);
    const raw = hours <= GS_STATS_FROM_HOURS;
    const specs = [];
    let histKey = null;
    let trendKey = null;
    if (c.show_sparkline) {
      histKey = c.entity + '@' + hours;
      specs.push({ key: histKey, hours, stats: !raw });
    }
    if (c.show_trend !== false && (!c.show_sparkline || !raw)) {
      trendKey = c.entity + '@trend';
      specs.push({ key: trendKey, hours: 3, stats: false });
    }
    if (this._histKey !== histKey || this._trendKey !== trendKey) {
      this._unsubscribeHistory();
      this._histKey = histKey;
      this._trendKey = trendKey;
    }
    specs.forEach((spec) => this._loadHistory(spec));
  }

  /** Load one history cache if it is missing or stale (statistics for long periods, raw history otherwise). */
  _loadHistory(spec) {
    const c = this._config;
    const hass = this._hass;
    const { key, hours } = spec;
    const cache = (GS_HIST[key] = GS_HIST[key] || { subs: new Set(), init: false });
    cache.subs.add(this);

    if (!cache.init) {
      cache.init = true;
      try {
        const saved = JSON.parse(localStorage.getItem(GS_LS_PREFIX + key) || 'null');
        if (saved && saved.pts && Date.now() - saved.t < GS_LS_MAX_AGE_MS) {
          Object.assign(cache, { pts: saved.pts, start: saved.start, end: saved.end, t: saved.t });
          this._paint();
        }
      } catch (e) {
        console.error('GlowStat: cannot read the local history cache', e);
      }
    }

    const stale = !cache.t || Date.now() - cache.t > GS_REFRESH_MS;
    const idle = !cache.busy || Date.now() - cache.busyAt > GS_BUSY_TIMEOUT_MS;
    if (!stale || !idle) return;
    if (typeof hass.callApi !== 'function') {
      cache.err = 'hass.callApi is not available';
      console.error('GlowStat: hass.callApi is not available, cannot load history for ' + c.entity);
      this._paint();
      return;
    }

    cache.busy = true;
    cache.busyAt = Date.now();
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600 * 1000);
    const toSec = (v) => (typeof v === 'number' ? (v > 1e12 ? v / 1000 : v) : Date.parse(v) / 1000);

    const finish = () => {
      cache.busy = false;
      cache.t = Date.now();
      cache.subs.forEach((card) => {
        try {
          card._paint();
        } catch (e) {
          console.error('GlowStat: repaint failed', e);
        }
      });
    };

    const viaHistory = () => hass.callApi('GET', 'history/period/' + start.toISOString()
      + '?filter_entity_id=' + encodeURIComponent(c.entity)
      + '&end_time=' + encodeURIComponent(end.toISOString())
      + '&minimal_response&no_attributes&significant_changes_only=0').then((r) => ((r && r[0]) || [])
      .map((p) => [Date.parse(p.last_changed || p.last_updated) / 1000, parseFloat(p.state)])
      .filter((p) => !isNaN(p[0]) && !isNaN(p[1])));

    const viaStatistics = () => hass.callWS({
      type: 'recorder/statistics_during_period',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      statistic_ids: [c.entity],
      period: hours <= 720 ? 'hour' : 'day',
      types: ['mean'],
    }).then((r) => ((r && r[c.entity]) || [])
      .map((p) => [toSec(p.start), Number(p.mean)])
      .filter((p) => !isNaN(p[0]) && !isNaN(p[1]))).catch((e) => {
      console.error('GlowStat: statistics request failed for ' + c.entity + ', using the history instead', e);
      return [];
    });

    try {
      const request = spec.stats && typeof hass.callWS === 'function'
        ? viaStatistics().then((pts) => (pts.length >= 2 ? pts : viaHistory()))
        : viaHistory();
      request.then((pts) => {
        cache.pts = pts;
        cache.start = start.getTime() / 1000;
        cache.end = end.getTime() / 1000;
        cache.err = null;
        try {
          localStorage.setItem(GS_LS_PREFIX + key, JSON.stringify({
            t: Date.now(), start: cache.start, end: cache.end, pts: cache.pts,
          }));
        } catch (e) {
          console.error('GlowStat: cannot save the local history cache', e);
        }
      }).catch((e) => {
        cache.err = (e && (e.message || e.error)) || String(e);
        console.error('GlowStat: history request failed for ' + c.entity, e);
      }).finally(finish);
    } catch (e) {
      cache.err = (e && e.message) || String(e);
      console.error('GlowStat: history request could not start for ' + c.entity, e);
      cache.busy = false;
      cache.t = Date.now() - GS_REFRESH_MS + 60000; // retry in about a minute
    }
  }

  /**
   * Change of the value over the last hour from the cached raw history.
   * @param {number} nowVal Current value.
   * @returns {number|null} The change, or null when there is not enough history.
   */
  _trend(nowVal) {
    const cache = this._trendKey ? GS_HIST[this._trendKey] : GS_HIST[this._histKey];
    const pts = cache && cache.pts;
    if (!pts || !pts.length) return null;
    const ref = cache.end - 3600;
    let before = null;
    for (const p of pts) {
      if (p[0] <= ref) before = p; else break;
    }
    if (!before) {
      if (pts[0][0] - ref > 1800) return null;
      before = pts[0];
    }
    return nowVal - before[1];
  }

  /** Build the sparkline markup from the cached history. */
  _sparkHtml(rgb) {
    const hass = gsLangObj(this._hass, this._config);
    const cache = GS_HIST[this._histKey] || {};
    const pts = cache.pts || [];
    if (pts.length < 2) {
      if (cache.err) return `<div class="err">⚠ ${gsEsc(cache.err)}</div>`;
      return `<div class="msg">${gsEsc(gsT(hass, (cache.busy || !cache.t) ? 'loading' : 'not_enough'))}</div>`;
    }
    const c = rgb.join(',');
    const N = 72;
    const span = cache.end - cache.start;
    const arr = new Array(N).fill(null);
    pts.forEach((p) => {
      const i = Math.min(N - 1, Math.max(0, Math.floor((p[0] - cache.start) / span * N)));
      arr[i] = p[1];
    });
    let last = pts[0][1];
    for (let i = 0; i < N; i++) {
      if (arr[i] === null) arr[i] = last; else last = arr[i];
    }
    const mn = Math.min(...arr);
    const mx = Math.max(...arr);
    const lo = mn - 0.4;
    const hi = mx + 0.4;
    const W = 120;
    const H = 40;
    const X = (i) => (i / (N - 1) * W).toFixed(1);
    const Y = (val) => (H - (val - lo) / (hi - lo) * H).toFixed(1);
    const line = arr.map((val, i) => (i === 0 ? 'M' : 'L') + X(i) + ',' + Y(val)).join(' ');
    const area = `${line} L${W},${H} L0,${H} Z`;
    const ey = (H - (arr[N - 1] - lo) / (hi - lo) * H) / H * 100;
    const hours = Math.max(1, Number(this._config.history_hours) || 24);
    return `<div class="plot">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <defs><linearGradient id="${this._uid}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="rgb(${c})" stop-opacity="0.35"></stop>
            <stop offset="1" stop-color="rgb(${c})" stop-opacity="0"></stop>
          </linearGradient></defs>
          <path d="${area}" fill="url(#${this._uid})" stroke="none"></path>
          <path d="${line}" fill="none" stroke="rgb(${c})" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"></path>
        </svg>
        <div class="dot" style="top:${ey}%;background:rgb(${c});box-shadow:0 0 6px rgba(${c},0.9)"></div>
      </div>
      <div class="legend"><span>▼ ${gsNum(hass, mn, 1)}°</span><span>${hours} ${gsEsc(gsT(hass, 'hours'))}</span><span>▲ ${gsNum(hass, mx, 1)}°</span></div>`;
  }

  _paint() {
    const hass = this._hass;
    const cfg = this._config;
    if (!hass || !cfg) return;
    const L = gsLangObj(hass, cfg);

    const st = hass.states[cfg.entity];
    const raw = st ? parseFloat(st.state) : NaN;
    const ok = !isNaN(raw);
    const unit = (st && st.attributes.unit_of_measurement) || '°C';
    const isF = unit === '°F';
    const celsius = ok ? (isF ? (raw - 32) * 5 / 9 : raw) : NaN;
    const toDisp = (cv) => Math.round(isF ? cv * 9 / 5 + 32 : cv);

    const stops = gsStops(cfg.comfort_min, cfg.comfort_max);
    const cmin = stops[2][0];
    const cmax = stops[3][0];
    const rgb = gsColor(celsius, stops);
    const c = rgb.join(',');
    const name = cfg.name || (st && st.attributes.friendly_name) || cfg.entity;

    let word = 'no_data';
    if (ok) {
      word = celsius >= cmax + 8 ? 'hot' : celsius >= cmax + 4 ? 'warm' : celsius > cmax ? 'pleasant'
        : celsius >= cmin ? 'comfortable' : celsius >= cmin - 4 ? 'cool' : celsius >= 0 ? 'cold' : 'freezing';
    }

    // Battery
    let batHtml = '';
    const bst = cfg.battery_entity && hass.states[cfg.battery_entity];
    const b = bst ? parseFloat(bst.state) : NaN;
    if (!isNaN(b)) {
      const icon = b >= 95 ? 'mdi:battery' : 'mdi:battery-' + Math.max(10, Math.round(b / 10) * 10);
      const col = b < 20 ? '#ef5350' : b < 40 ? '#ffa726' : 'var(--secondary-text-color)';
      batHtml = `<div class="bat" data-entity="${gsEsc(cfg.battery_entity)}" tabindex="0" role="button" aria-label="${gsEsc(bst.attributes.friendly_name || cfg.battery_entity)}" style="color:${col}"><ha-icon icon="${icon}"></ha-icon>${Math.round(b)} %</div>`;
    }

    // Humidity
    let humHtml = '';
    const hst = cfg.humidity_entity && hass.states[cfg.humidity_entity];
    const h = hst ? parseFloat(hst.state) : NaN;
    if (!isNaN(h)) {
      const moldAt = cfg.mold_humidity === undefined || cfg.mold_humidity === null || cfg.mold_humidity === '' ? 70 : Number(cfg.mold_humidity);
      const mold = moldAt > 0 && h >= moldAt;
      const col = mold ? '#ef5350' : h >= 40 && h <= 60 ? '#42a5f5' : '#ffa726';
      let sub = '';
      if (mold) {
        sub = gsT(L, 'mold_risk');
      } else if (cfg.show_dew_point && ok && h > 0) {
        const g = Math.log(h / 100) + (17.62 * celsius) / (243.12 + celsius);
        const dew = 243.12 * g / (17.62 - g);
        sub = gsT(L, 'dew_point') + ' ' + gsNum(L, isF ? dew * 9 / 5 + 32 : dew, 1) + '°';
      }
      humHtml = `<div class="hum" data-entity="${gsEsc(cfg.humidity_entity)}" tabindex="0" role="button" aria-label="${gsEsc(hst.attributes.friendly_name || cfg.humidity_entity)}" style="color:${col}"><div class="hv"><ha-icon icon="mdi:water-percent"></ha-icon>${Math.round(h)} %</div>${sub ? `<div class="hsub">${gsEsc(sub)}</div>` : ''}</div>`;
    }

    // Trend arrow: change over the last hour
    let trendHtml = '';
    if (cfg.show_trend !== false && ok) {
      const d = this._trend(raw);
      if (d !== null) {
        const thr = isF ? 0.5 : 0.3;
        const dir = d >= thr ? 'up' : d <= -thr ? 'down' : 'flat';
        const arrow = { up: '▲', down: '▼', flat: '→' }[dir];
        const tcol = { up: '#ff7043', down: '#42a5f5', flat: 'var(--secondary-text-color)' }[dir];
        const amount = dir === 'flat' ? '' : ` ${d > 0 ? '+' : '−'}${gsNum(L, Math.abs(d), 1)}°`;
        trendHtml = `<div class="trend" style="color:${tcol}" title="${gsEsc(gsT(L, 'trend_hour'))}">${arrow}${amount}</div>`;
      }
    }

    // Scale bar (dynamic range around the value)
    const lo = ok ? Math.min(10, Math.floor((celsius - 2) / 2) * 2) : 10;
    const hi = ok ? Math.max(32, Math.ceil((celsius + 2) / 2) * 2) : 32;
    const spanC = hi - lo;
    const pos = (t) => ((t - lo) / spanC * 100).toFixed(1);
    const pct = ok ? Math.min(100, Math.max(0, (celsius - lo) / spanC * 100)) : 0;
    const grad = 'linear-gradient(90deg, '
      + stops.map((s) => 'rgb(' + s[1].join(',') + ') ' + pos(s[0]) + '%').join(', ') + ')';

    // Background emoji
    let bgHtml = '';
    if (cfg.show_background_emoji !== false) {
      const E = !ok ? ['❔', ''] : celsius < 0 ? ['🧊', 'shiver'] : celsius < 10 ? ['🐧', 'waddle']
        : celsius < 16 ? ['🧣', 'bob'] : celsius < 20 ? ['🧥', 'bob'] : celsius < 23 ? ['😎', 'bob']
          : celsius < 26 ? ['🌤️', 'bob'] : celsius < 30 ? ['🥵', 'pulse'] : ['🔥', 'pulse'];
      const dur = { shiver: '0.5s', waddle: '1.4s', bob: '2.8s', pulse: '1.1s' }[E[1]] || '2s';
      const anim = E[1] ? `animation:${E[1]} ${dur} ease-in-out infinite` : '';
      bgHtml = `<div class="bgicon"><div style="${anim}">${E[0]}</div></div>`;
    }

    const sparkHtml = cfg.show_sparkline
      ? `<div class="spark">${this._sparkHtml(rgb)}</div>` : '';

    const bg = ok
      ? `radial-gradient(circle at 30% 45%, rgba(${c},0.20) 0%, rgba(${c},0.06) 60%, var(--ha-card-background, var(--card-background-color)) 100%)`
      : 'var(--ha-card-background, var(--card-background-color))';
    const border = ok ? `1px solid rgba(${c},0.35)` : '1px solid var(--ha-card-border-color, var(--divider-color))';

    gsSetHtml(this.shadowRoot, `
      <style>${GS_THERMO_CSS}</style>
      <ha-card tabindex="0" role="button" aria-label="${gsEsc(name)}" style="background:${bg};border:${border}">
        <div class="card">
          ${bgHtml}
          <div class="head"><div class="name">${gsEsc(name)}</div><div class="word" style="color:rgb(${c})">${gsEsc(gsT(L, word))}</div></div>
          ${batHtml}
          <div class="temp" style="color:rgb(${c})"><div>${ok ? gsNum(L, raw, 1) : '–'}<small> ${gsEsc(unit)}</small></div>${trendHtml}</div>
          ${sparkHtml}
          ${humHtml}
          <div class="bar">
            <div class="track" style="background:${grad}">
              <div class="marker" style="left:${pct}%;border-color:rgb(${c});box-shadow:0 0 6px rgba(${c},0.8)"></div>
            </div>
            <div class="scale"><span>${toDisp(lo)}°</span><span>${toDisp(hi)}°</span></div>
          </div>
        </div>
      </ha-card>`);

    const card = this.shadowRoot.querySelector('ha-card');
    // The more-info dialog opens for the element that was clicked: battery, humidity or (default) temperature.
    const open = (ev) => {
      const el = ev.composedPath().find((n) => n.dataset && n.dataset.entity);
      gsFire(this, 'hass-more-info', { entityId: el ? el.dataset.entity : cfg.entity });
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        open(ev);
      }
    });
  }
}

/** GUI editor for the thermometer card. */
class GlowStatThermometerCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    else this._render();
  }

  _schema() {
    return [
      { name: 'entity', required: true, selector: { entity: { domain: 'sensor', device_class: 'temperature' } } },
      { name: 'name', selector: { text: {} } },
      { name: 'humidity_entity', selector: { entity: { domain: 'sensor', device_class: 'humidity' } } },
      { name: 'battery_entity', selector: { entity: { domain: 'sensor', device_class: 'battery' } } },
      { name: 'show_sparkline', selector: { boolean: {} } },
      { name: 'history_hours', selector: { number: { min: 1, max: 720, step: 1, mode: 'box' } } },
      { name: 'show_trend', selector: { boolean: {} } },
      { name: 'show_dew_point', selector: { boolean: {} } },
      { name: 'mold_humidity', selector: { number: { min: 0, max: 100, step: 1, mode: 'box' } } },
      { name: 'comfort_min', selector: { number: { min: 5, max: 35, step: 0.5, mode: 'box' } } },
      { name: 'comfort_max', selector: { number: { min: 5, max: 35, step: 0.5, mode: 'box' } } },
      { name: 'show_background_emoji', selector: { boolean: {} } },
      gsLanguageField(this._hass),
    ];
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => gsT(this._hass, s.name);
      this._form.addEventListener('value-changed', (ev) => {
        const next = { ...this._config, ...ev.detail.value };
        Object.keys(next).forEach((k) => {
          if (next[k] === '' || next[k] === undefined || next[k] === null) delete next[k];
        });
        this._config = next;
        gsFire(this, 'config-changed', { config: next });
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = this._schema();
    this._form.data = {
      show_sparkline: true,
      show_background_emoji: true,
      show_trend: true,
      history_hours: 24,
      language: 'auto',
      ...this._config,
    };
  }
}

customElements.define('glowstat-thermometer-card', GlowStatThermometerCard);
customElements.define('glowstat-thermometer-card-editor', GlowStatThermometerCardEditor);
gsRegisterCard({
  type: 'glowstat-thermometer-card',
  name: 'GlowStat Thermometer',
  description: 'Glowing temperature card with humidity, battery, scale and 24 h history.',
});
/**
 * glowstat-climate-card: compact climate card (heating or air conditioner) with a
 * state-colored glow, target temperature +/- buttons and control buttons that are
 * built from the modes the entity reports (HVAC, preset, fan, swing) and picked one by one.
 */

Object.assign(GS_I18N.en, {
  c_heating: 'Heating', c_cooling: 'Cooling', c_drying: 'Drying', c_fan: 'Fan',
  c_idle: 'Idle', c_off: 'Off', c_defrosting: 'Defrosting', c_preheating: 'Preheating',
  m_off: 'Off', m_auto: 'Auto', m_heat_cool: 'Heat/Cool', m_heat: 'Heat', m_cool: 'Cool', m_dry: 'Dry', m_fan_only: 'Fan',
  s_off: 'Off', s_auto: 'Automatic', s_heat_cool: 'Heat/Cool', s_heat: 'Heating', s_cool: 'Cooling', s_dry: 'Drying', s_fan_only: 'Fan',
  p_auto: 'Auto', p_manual: 'Manual', p_comfort: 'Comfort', p_eco: 'Eco', p_away: 'Away', p_home: 'Home',
  p_sleep: 'Sleep', p_boost: 'Boost', p_none: 'None', p_activity: 'Activity',
  controls: 'Control buttons', k_hvac_mode: 'Mode', k_preset_mode: 'Preset', k_fan_mode: 'Fan', k_swing_mode: 'Swing',
  icon: 'Icon', climate_entity: 'Climate entity', set_failed: 'Could not change the climate setting',
  ms_off: 'off', ms_auto: 'automatic', ms_heat_cool: 'switch', ms_heat: 'warm', ms_cool: 'cold', ms_dry: 'dehumidify', ms_fan_only: 'fan',
  ps_auto: 'schedule', ps_manual: 'manual', preset_temperatures: 'Preset temperatures',
  temp_down: 'Lower the target temperature', temp_up: 'Raise the target temperature',
  f_sensor_unavailable: 'Sensor lost – heating off', f_sensor_stale: 'Sensor silent – heating off',
  f_sensor: 'Sensor fault', f_relay: 'Relay not responding',
  f_backup: 'Backup sensor', f_limp: 'Emergency cycle', f_limp_n: 'Emergency cycle: {on} of {period} min',
});
Object.assign(GS_I18N.hu, {
  c_heating: 'Fűt', c_cooling: 'Hűt', c_drying: 'Szárít', c_fan: 'Ventilál',
  c_idle: 'Pihen', c_off: 'Kikapcsolva', c_defrosting: 'Leolvasztás', c_preheating: 'Előfűtés',
  m_off: 'Ki', m_auto: 'Auto', m_heat_cool: 'Fűt/hűt', m_heat: 'Fűtés', m_cool: 'Hűtés', m_dry: 'Szárít', m_fan_only: 'Ventil.',
  s_off: 'Kikapcsolva', s_auto: 'Automata', s_heat_cool: 'Fűtés/hűtés', s_heat: 'Fűtés', s_cool: 'Hűtés', s_dry: 'Szárítás', s_fan_only: 'Ventilátor',
  p_auto: 'Auto', p_manual: 'Manual', p_comfort: 'Komfort', p_eco: 'Eco', p_away: 'Távol', p_home: 'Otthon',
  p_sleep: 'Alvás', p_boost: 'Boost', p_none: 'Nincs', p_activity: 'Aktív',
  controls: 'Vezérlő gombok', k_hvac_mode: 'Üzemmód', k_preset_mode: 'Előbeállítás', k_fan_mode: 'Ventilátor', k_swing_mode: 'Lengés',
  icon: 'Ikon', climate_entity: 'Klíma entitás', set_failed: 'A beállítás módosítása nem sikerült',
  ms_off: 'kikapcs.', ms_auto: 'automata', ms_heat_cool: 'váltó', ms_heat: 'meleg', ms_cool: 'hideg', ms_dry: 'párátlan', ms_fan_only: 'ventilátor',
  ps_auto: 'program', ps_manual: 'kézi', preset_temperatures: 'Előbeállítás hőfokok',
  temp_down: 'Alacsonyabb célhőmérséklet', temp_up: 'Magasabb célhőmérséklet',
  f_sensor_unavailable: 'Érzékelő kiesett – fűtés ki', f_sensor_stale: 'Érzékelő néma – fűtés ki',
  f_sensor: 'Érzékelő hiba', f_relay: 'A relé nem válaszol',
  f_backup: 'Tartalék érzékelő', f_limp: 'Vészciklus', f_limp_n: 'Vészciklus: {on} / {period} perc',
});

const GS_MODE_RGB = {
  cool: '66,165,245', heat: '255,112,67', dry: '38,166,154',
  auto: '102,187,106', heat_cool: '102,187,106', fan_only: '144,164,174',
};
/** Color of a zone whose fail-safe has tripped (sensor lost or silent, relay not responding). */
const GS_FAULT_RGB = '239,83,80';
const GS_ACTION_MODE = { heating: 'heat', preheating: 'heat', cooling: 'cool', drying: 'dry', fan: 'fan_only' };
const GS_MODE_ICON = {
  off: 'mdi:power', auto: 'mdi:thermostat-auto', heat_cool: 'mdi:sun-snowflake-variant',
  heat: 'mdi:fire', cool: 'mdi:snowflake', dry: 'mdi:water-percent', fan_only: 'mdi:fan',
};
const GS_PRESET_ICON = {
  auto: 'mdi:calendar-clock', manual: 'mdi:hand-back-right', comfort: 'mdi:sofa', eco: 'mdi:leaf',
  away: 'mdi:car', home: 'mdi:home', sleep: 'mdi:sleep', boost: 'mdi:rocket-launch',
  none: 'mdi:cancel', activity: 'mdi:run',
};

/**
 * Button kinds a climate entity can offer. `list` is the entity attribute that lists the
 * available values, `service` the climate service that sets one, `active` reads the current
 * value. A button is addressed as "<kind>:<value>"; the service field is named like the kind.
 */
const GS_BUTTON_KINDS = {
  hvac_mode: { list: 'hvac_modes', service: 'set_hvac_mode', icon: 'mdi:thermostat', active: (st) => st.state },
  preset_mode: { list: 'preset_modes', service: 'set_preset_mode', icon: 'mdi:tune', active: (st) => st.attributes.preset_mode },
  fan_mode: { list: 'fan_modes', service: 'set_fan_mode', icon: 'mdi:fan', active: (st) => st.attributes.fan_mode },
  swing_mode: { list: 'swing_modes', service: 'set_swing_mode', icon: 'mdi:arrow-oscillating', active: (st) => st.attributes.swing_mode },
};

/** Key of a configured button: "<kind>:<value>" (a string, or an object with type and value). */
function gsControlKey(item) {
  return typeof item === 'string' ? item : item.type + ':' + item.value;
}

/** Normalize a configured button to {kind, value, name?, icon?, sub?}. */
function gsParseControl(item) {
  if (typeof item === 'string') {
    const i = item.indexOf(':');
    return { kind: item.slice(0, i), value: item.slice(i + 1) };
  }
  return { ...item, kind: item.type };
}

/**
 * Buttons shown when `controls` is not an explicit list (also the legacy string values
 * 'auto', 'presets', 'hvac_modes', 'none'). Everything comes from the entity's own lists.
 */
function gsDefaultControls(st, mode) {
  const modes = st.attributes.hvac_modes || [];
  const hvac = [...modes.filter((m) => m === 'off'), ...modes.filter((m) => m !== 'off')].map((m) => 'hvac_mode:' + m);
  const presets = (st.attributes.preset_modes || []).map((p) => 'preset_mode:' + p);
  if (mode === 'none') return [];
  if (mode === 'presets') return presets;
  if (mode === 'hvac_modes') return hvac;
  return modes.length > 2 ? hvac : (presets.length ? presets : hvac);
}

/** Label of a button value: own translation first, then Home Assistant's formatter, then the raw value. */
function gsButtonLabel(hass, L, st, kind, value) {
  const prefix = { hvac_mode: 'm_', preset_mode: 'p_' }[kind];
  if (prefix) {
    const own = gsT(L, prefix + value);
    if (own !== prefix + value) return own;
  }
  try {
    if (kind === 'hvac_mode' && typeof hass.formatEntityState === 'function') return hass.formatEntityState(st, value);
    if (typeof hass.formatEntityAttributeValue === 'function') return hass.formatEntityAttributeValue(st, kind, value);
  } catch (e) {
    console.error('GlowStat: cannot format ' + kind + ' ' + value, e);
  }
  return value;
}

const GS_CLIMATE_CSS = `
  :host { display: block; }
  ha-card { display: block; height: 100%; overflow: hidden; position: relative; container-type: inline-size; }
  [tabindex]:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 6px; }
  ha-card.live { animation: glowpulse 2.4s ease-in-out infinite; }
  @keyframes glowpulse {
    0%, 100% { box-shadow: inset 0 0 0 0 rgba(var(--g), 0); }
    50% { box-shadow: inset 0 0 18px 0 rgba(var(--g), 0.35); }
  }
  @media (prefers-reduced-motion: reduce) { ha-card.live { animation: none; } }
  .card {
    box-sizing: border-box; height: 100%; min-height: 176px; padding: 10px;
    display: grid; gap: 8px; align-items: center; align-content: space-between;
    grid-template-columns: auto 1fr auto;
    grid-template-areas: 'head head cur' 'minus temp plus' 'btns btns btns';
  }
  .more { cursor: pointer; }
  .head { grid-area: head; justify-self: start; display: flex; align-items: center; gap: 10px; text-align: left; }
  .head ha-icon { --mdc-icon-size: 26px; }
  .name { font-weight: 600; font-size: 14px; }
  .status { font-size: 12px; }
  .cur { grid-area: cur; justify-self: end; align-self: start; display: flex; align-items: center; gap: 2px; font-size: 16px; font-weight: 600; }
  .cur ha-icon { --mdc-icon-size: 18px; }
  .temp { grid-area: temp; justify-self: center; font-size: 24px; font-weight: 300; line-height: 1; }
  .rb {
    width: 44px; height: 44px; box-sizing: border-box; border-radius: 50%; display: flex; align-items: center;
    justify-content: center; border: 1px solid var(--divider-color); cursor: pointer; user-select: none;
  }
  .rb ha-icon { --mdc-icon-size: 22px; }
  .rb.disabled { opacity: 0.35; pointer-events: none; }
  .rb:active { background: color-mix(in srgb, var(--primary-color) 18%, transparent); }
  .minus { grid-area: minus; justify-self: start; }
  .plus { grid-area: plus; justify-self: end; }
  .btns { grid-area: btns; width: 100%; display: grid; gap: 2px; grid-template-columns: repeat(auto-fit, minmax(46px, 1fr)); }
  .btn {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
    padding: 5px 2px; border-radius: 14px; cursor: pointer; user-select: none; min-width: 0;
    color: var(--primary-text-color); font-size: 11px; font-weight: 500; text-align: center;
  }
  .btn span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .btn .bs { font-size: 10px; font-weight: 400; opacity: 0.7; }
  .btn ha-icon { --mdc-icon-size: 22px; color: var(--secondary-text-color); }
  .btn.active { background: color-mix(in srgb, var(--primary-color) 22%, transparent); color: var(--primary-color); }
  .btn.active ha-icon { color: var(--primary-color); }
  @container (max-width: 300px) {
    .card { min-height: 150px; padding: 8px; gap: 6px; }
    .btn .bs { display: none; }
    .temp { font-size: 20px; }
    .rb { width: 38px; height: 38px; }
  }
`;

class GlowStatClimateCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._sig = '';
    this._pending = null;
    this.shadowRoot.addEventListener('click', (ev) => this._onClick(ev));
    this.shadowRoot.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      ev.preventDefault();
      this._onClick(ev);
    });
  }

  static getConfigElement() {
    return document.createElement('glowstat-climate-card-editor');
  }

  static getStubConfig(hass) {
    const entity = Object.keys((hass && hass.states) || {}).find((id) => id.startsWith('climate.'));
    return { entity: entity || 'climate.thermostat' };
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error('GlowStat: "entity" is required');
    }
    this._config = { ...config };
    this._sig = '';
    this._paint();
  }

  set hass(hass) {
    this._hass = hass;
    const st = hass.states[this._config && this._config.entity];
    if (this._pending !== null && st && Math.abs(Number(st.attributes.temperature) - this._pending) < 1e-6) {
      this._pending = null;
    }
    const sig = this._signature();
    if (sig !== this._sig) {
      this._sig = sig;
      this._paint();
    }
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return { columns: 12, rows: 'auto', min_columns: 4 };
  }

  _signature() {
    if (!this._hass || !this._config) return '';
    const st = this._hass.states[this._config.entity];
    if (!st) return '∅|' + gsLangObj(this._hass, this._config).language;
    const a = st.attributes;
    return [st.state, a.hvac_action, a.preset_mode, a.temperature, a.current_temperature, a.min_temp, a.max_temp,
      a.sensor_fault, a.sensor_source, a.limp_on_minutes, a.limp_period_minutes, JSON.stringify(a.relay_fault || []), this._pending, gsLangObj(this._hass, this._config).language, JSON.stringify(this._config.preset_temperatures || {})].join('|');
  }

  _stepOf(a) {
    if (a.target_temp_step) return Number(a.target_temp_step);
    return 0.5;
  }

  /** Mode key that decides the glow color, or null for a neutral card. */
  _colorMode(st) {
    const a = st.attributes;
    if (a.hvac_action !== undefined && a.hvac_action !== null) {
      return GS_ACTION_MODE[a.hvac_action] || null;
    }
    return st.state !== 'off' && GS_MODE_RGB[st.state] ? st.state : null;
  }

  /**
   * Fail-safe state reported by SmartHeatZones. Returns `{ text, hard }` or null when all is fine.
   * `hard` (red, no pulsing) is only for a relay that does not respond, and for SmartHeatZones before
   * 1.12.0 (no `sensor_source` attribute), where `sensor_fault` still meant "heating off". Since 1.12.0
   * the zone keeps heating on its backup sensor or in the emergency cycle, so those are a neutral hint.
   */
  _fault(st) {
    const L = gsLangObj(this._hass, this._config);
    const a = st.attributes;
    if (Array.isArray(a.relay_fault) && a.relay_fault.length) return { text: gsT(L, 'f_relay'), hard: true };
    if (!a.sensor_fault) return null;
    if (a.sensor_source === undefined || a.sensor_source === null) {
      const key = 'f_' + a.sensor_fault;
      const text = gsT(L, key);
      return { text: text === key ? gsT(L, 'f_sensor') : text, hard: true };
    }
    if (a.sensor_source === 'backup') return { text: gsT(L, 'f_backup'), hard: false };
    if (a.sensor_source === 'none') {
      const on = Number(a.limp_on_minutes);
      const period = Number(a.limp_period_minutes);
      if (a.limp_on_minutes != null && a.limp_period_minutes != null && isFinite(on) && isFinite(period)) {
        return { text: gsT(L, 'f_limp_n').replace('{on}', gsNum(L, on, 0)).replace('{period}', gsNum(L, period, 0)), hard: false };
      }
      return { text: gsT(L, 'f_limp'), hard: false };
    }
    return { text: gsT(L, 'f_sensor'), hard: false };
  }

  _statusText(st) {
    const hass = gsLangObj(this._hass, this._config);
    const a = st.attributes;
    if (st.state === 'off') return gsT(hass, 's_off');
    if (a.hvac_action !== undefined && a.hvac_action !== null) {
      const key = 'c_' + (a.hvac_action === 'fan' ? 'fan' : a.hvac_action);
      const txt = gsT(hass, key);
      return txt === key ? String(a.hvac_action) : txt;
    }
    const key = 's_' + st.state;
    const txt = gsT(hass, key);
    return txt === key ? st.state : txt;
  }

  /** Control buttons to show: [{kind, value, icon, label, sub, active}], built from the entity's own lists. */
  _buttons(st) {
    const L = gsLangObj(this._hass, this._config);
    const hass = this._hass;
    const cfg = this._config;
    const items = Array.isArray(cfg.controls) ? cfg.controls : gsDefaultControls(st, cfg.controls);
    const temps = { ...(st.attributes.preset_temperatures || {}), ...(cfg.preset_temperatures || {}) };
    const out = [];
    items.forEach((item) => {
      const o = gsParseControl(item);
      const def = GS_BUTTON_KINDS[o.kind];
      if (!def || !(st.attributes[def.list] || []).includes(o.value)) return;
      let sub = o.sub;
      if (sub === undefined) {
        sub = '';
        if (o.kind === 'hvac_mode' && gsT(L, 'ms_' + o.value) !== 'ms_' + o.value) sub = gsT(L, 'ms_' + o.value);
        if (o.kind === 'preset_mode') {
          if (temps[o.value] !== undefined) {
            sub = gsNum(L, Number(temps[o.value]), Number(temps[o.value]) % 1 ? 1 : 0) + ' °C';
          } else if (gsT(L, 'ps_' + o.value) !== 'ps_' + o.value) {
            sub = gsT(L, 'ps_' + o.value);
          }
        }
      }
      const icon = o.icon || (o.kind === 'hvac_mode' ? GS_MODE_ICON[o.value] : o.kind === 'preset_mode' ? GS_PRESET_ICON[o.value] : '') || def.icon;
      out.push({
        kind: o.kind, value: o.value, icon, sub,
        label: o.name || gsButtonLabel(hass, L, st, o.kind, o.value),
        active: def.active(st) === o.value,
      });
    });
    return out;
  }

  _paint() {
    const hass = this._hass;
    const cfg = this._config;
    if (!hass || !cfg) return;
    const L = gsLangObj(hass, cfg);
    const st = hass.states[cfg.entity];
    if (!st) {
      gsSetHtml(this.shadowRoot, `<style>${GS_CLIMATE_CSS}</style><ha-card><div class="card"><div class="name">${gsEsc(cfg.entity)}: ${gsEsc(gsT(L, 'no_data'))}</div></div></ha-card>`);
      return;
    }
    const a = st.attributes;
    const mode = this._colorMode(st);
    const fault = this._fault(st);
    const hard = Boolean(fault && fault.hard);
    const rgb = hard ? GS_FAULT_RGB : (mode ? GS_MODE_RGB[mode] : null);
    const col = rgb ? `rgb(${rgb})` : 'var(--secondary-text-color)';
    const valCol = rgb ? `rgb(${rgb})` : 'var(--primary-text-color)';
    const name = cfg.name || a.friendly_name || cfg.entity;
    const icon = cfg.icon || a.icon || 'mdi:thermostat';

    const step = this._stepOf(a);
    const decimals = step < 1 ? 1 : 0;
    const target = this._pending !== null ? this._pending : (a.temperature === undefined || a.temperature === null ? null : Number(a.temperature));
    const targetTxt = target === null || isNaN(target) ? '–' : gsNum(L, target, decimals);
    const unit = a.temperature_unit || hass.config?.unit_system?.temperature || '°C';
    const dis = target === null || isNaN(target) ? ' disabled' : '';
    const rbRgb = GS_MODE_RGB[st.state];
    const rbStyle = rbRgb ? `color:rgb(${rbRgb});border-color:rgba(${rbRgb},0.8)` : 'color:var(--primary-color)';
    const curTxt = a.current_temperature === undefined || a.current_temperature === null
      ? '' : `<div class="cur more" role="button" tabindex="0" aria-label="${gsEsc(name)}" style="color:${valCol}"><ha-icon icon="mdi:thermometer"></ha-icon>${gsNum(L, Number(a.current_temperature), 1)} ${gsEsc(unit)}</div>`;

    const live = Boolean(rgb) && !hard && a.hvac_action !== undefined && a.hvac_action !== null && Boolean(GS_ACTION_MODE[a.hvac_action]);
    const btns = this._buttons(st);
    const btnHtml = btns.length
      ? `<div class="btns">${btns.map((b) => `
          <div class="btn${b.active ? ' active' : ''}" role="button" tabindex="0" aria-pressed="${b.active}" aria-label="${gsEsc(b.label)}" data-kind="${b.kind}" data-value="${gsEsc(b.value)}">
            <ha-icon icon="${gsEsc(b.icon)}"></ha-icon><span class="bl">${gsEsc(b.label)}</span>${b.sub ? `<span class="bs">${gsEsc(b.sub)}</span>` : ''}
          </div>`).join('')}</div>` : '';

    const bg = rgb
      ? `radial-gradient(circle at 50% 45%, rgba(${rgb},0.28) 0%, rgba(${rgb},0.08) 60%, var(--ha-card-background, var(--card-background-color)) 100%)`
      : 'var(--ha-card-background, var(--card-background-color))';
    const border = rgb ? `1px solid rgba(${rgb},0.45)` : '1px solid var(--ha-card-border-color, var(--divider-color))';

    gsSetHtml(this.shadowRoot, `
      <style>${GS_CLIMATE_CSS}</style>
      <ha-card class="${live ? 'live' : ''}" style="--g:${rgb || '0,0,0'};background:${bg};border:${border}">
        <div class="card">
          <div class="head more" role="button" tabindex="0" aria-label="${gsEsc(fault ? name + ': ' + fault.text : name)}"><ha-icon icon="${gsEsc(icon)}" style="color:${col}"></ha-icon>
            <div><div class="name">${gsEsc(name)}</div><div class="status" style="color:${col}">${gsEsc(hard ? '⚠ ' + fault.text : fault ? this._statusText(st) + ' · ' + fault.text : this._statusText(st))}</div></div></div>
          ${curTxt}
          <div class="rb minus${dis}" style="${rbStyle}" role="button" tabindex="0" aria-label="${gsEsc(gsT(L, 'temp_down'))}" data-kind="step" data-value="-1"><ha-icon icon="mdi:minus"></ha-icon></div>
          <div class="temp more" role="button" tabindex="0" aria-label="${gsEsc(name)}" style="color:${valCol}">${targetTxt} ${gsEsc(unit)}</div>
          <div class="rb plus${dis}" style="${rbStyle}" role="button" tabindex="0" aria-label="${gsEsc(gsT(L, 'temp_up'))}" data-kind="step" data-value="1"><ha-icon icon="mdi:plus"></ha-icon></div>
          ${btnHtml}
        </div>
      </ha-card>`);
  }

  _onClick(ev) {
    const hass = this._hass;
    const cfg = this._config;
    if (!hass || !cfg) return;
    const path = ev.composedPath();
    const el = path.find((n) => n.dataset && n.dataset.kind);
    if (!el) {
      if (path.some((n) => n.classList && n.classList.contains('more'))) {
        gsFire(this, 'hass-more-info', { entityId: cfg.entity });
      }
      return;
    }
    const kind = el.dataset.kind;
    const value = el.dataset.value;
    if (kind === 'step') {
      this._step(Number(value));
    } else if (GS_BUTTON_KINDS[kind]) {
      this._call(GS_BUTTON_KINDS[kind].service, { [kind]: value });
    }
  }

  _step(dir) {
    const st = this._hass.states[this._config.entity];
    if (!st) return;
    const a = st.attributes;
    const step = this._stepOf(a);
    const base = this._pending !== null ? this._pending : Number(a.temperature);
    if (isNaN(base)) return;
    const min = a.min_temp !== undefined ? Number(a.min_temp) : 5;
    const max = a.max_temp !== undefined ? Number(a.max_temp) : 35;
    const next = parseFloat((Math.round((base + dir * step) / step) * step).toFixed(2));
    this._pending = Math.min(max, Math.max(min, next));
    this._sig = '';
    this._paint();
    clearTimeout(this._sendTimer);
    clearTimeout(this._clearTimer);
    const wanted = this._pending;
    this._sendTimer = setTimeout(() => this._call('set_temperature', { temperature: wanted }), 500);
    this._clearTimer = setTimeout(() => {
      this._pending = null;
      this._sig = '';
      this._paint();
    }, 6000);
  }

  _call(service, data) {
    const cfg = this._config;
    let promise;
    try {
      promise = this._hass.callService('climate', service, { entity_id: cfg.entity, ...data });
    } catch (e) {
      this._callFailed(service, e);
      return;
    }
    if (promise && typeof promise.catch === 'function') {
      promise.catch((e) => this._callFailed(service, e));
    }
  }

  _callFailed(service, e) {
    console.error('GlowStat: climate.' + service + ' failed for ' + this._config.entity, e);
    this._pending = null;
    this._sig = '';
    this._paint();
    gsFire(this, 'hass-notification', {
      message: gsT(gsLangObj(this._hass, this._config), 'set_failed') + ' (' + ((e && e.message) || service) + ')',
    });
  }
}

/** GUI editor for the climate card. */
class GlowStatClimateCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    else this._render();
  }

  _schema() {
    const h = this._hass;
    return [
      { name: 'entity', required: true, selector: { entity: { domain: 'climate' } } },
      { name: 'name', selector: { text: {} } },
      { name: 'icon', selector: { icon: {} } },
      gsLanguageField(h),
      { name: 'controls', selector: { select: { multiple: true, reorder: true, mode: 'dropdown', options: this._options() } } },
    ];
  }

  /** Every button the selected entity offers, read from its own attribute lists. */
  _options() {
    const h = this._hass;
    const st = h.states[this._config.entity];
    if (!st) return [];
    const L = gsLangObj(h, this._config);
    const out = [];
    Object.entries(GS_BUTTON_KINDS).forEach(([kind, def]) => {
      (st.attributes[def.list] || []).forEach((v) => {
        out.push({ value: kind + ':' + v, label: gsT(L, 'k_' + kind) + ': ' + gsButtonLabel(h, L, st, kind, v) });
      });
    });
    return out;
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => gsT(this._hass, s.name === 'entity' ? 'climate_entity' : s.name);
      this._form.addEventListener('value-changed', (ev) => {
        const value = ev.detail.value;
        const next = { ...this._config, ...value };
        if (value.entity !== this._config.entity) {
          delete next.controls; // buttons of the previous entity do not apply to the new one
        } else if (Array.isArray(value.controls)) {
          // keep per-button overrides (name, icon, sub) that were set in YAML
          const old = new Map((Array.isArray(this._config.controls) ? this._config.controls : []).map((i) => [gsControlKey(i), i]));
          next.controls = value.controls.map((k) => old.get(k) || k);
        }
        Object.keys(next).forEach((k) => {
          if (next[k] === '' || next[k] === undefined || next[k] === null) delete next[k];
        });
        this._config = next;
        gsFire(this, 'config-changed', { config: next });
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = this._schema();
    const st = this._hass.states[this._config.entity];
    const c = this._config.controls;
    const controls = Array.isArray(c) ? c.map(gsControlKey) : (st ? gsDefaultControls(st, c) : []);
    this._form.data = { language: 'auto', ...this._config, controls };
  }
}

customElements.define('glowstat-climate-card', GlowStatClimateCard);
customElements.define('glowstat-climate-card-editor', GlowStatClimateCardEditor);
gsRegisterCard({
  type: 'glowstat-climate-card',
  name: 'GlowStat Climate',
  description: 'Compact heating / air conditioner card with glow, target temperature and mode buttons.',
});
/**
 * glowstat-heating-card: whole-house heating card. It reads only the SmartHeatZones overview entity
 * (`sensor.smartheatzones_overview`, contract schema 1): the boiler with today's counters and one row
 * per zone with its distance to the target, the source chip and the reason for its state.
 */

/** How long loaded history stays fresh (ms), and the retry delay after a failed request. */
const GS_HEAT_REFRESH_MS = 5 * 60 * 1000;
const GS_HEAT_RETRY_MS = 60 * 1000;

/** Newest overview contract this card understands. */
const GS_HEAT_SCHEMA = 1;

Object.assign(GS_I18N.en, {
  h_title: 'Heating', h_entity: 'Overview sensor (SmartHeatZones)',
  h_boiler_on: 'Boiler running', h_boiler_off: 'Boiler off', h_since: 'since {t}', h_held_by: 'held by',
  h_starts: 'starts', h_runtime: 'runtime', h_afterheat_joins: 'afterheat', h_counters_since: 'counting since {t}',
  h_boiler_failed: 'Boiler command failed', h_chip_afterheat: 'afterheat',
  h_src_backup: 'backup sensor', h_src_limp: 'emergency cycle',
  h_next: 'Next: {temp}° at {at}', h_unavailable: 'Overview not available', h_schema_new: 'The SmartHeatZones data (schema {n}) is newer than this card: update GlowStat.',
  h_sensors_ok: 'Sensors: {a} / {t} alive', h_backup_zones: '{n} on backup sensor', h_relay_faults: '{n} relay fault',
  show_timeline: 'Show timelines', show_eta: 'Show time to target', show_actions: 'Show quick actions',
  r_needs_heat: 'Cold – needs heat', r_holding: 'Heating until {off_above}°',
  r_afterheat: 'Riding along on the running boiler', r_in_band: 'Idle – heats below {on_below}°, target {target}°',
  r_target_reached: 'Target {target}° reached', r_door_open: 'Door or window open', r_hvac_off: 'Switched off',
  r_no_reading: 'No temperature reading', r_overheat: 'Overheat protection',
  r_limp_heating: 'Emergency cycle – heating now', r_limp_waiting: 'Emergency cycle – next heating in {next_in_min} min',
  r_limp_waiting_none: 'Emergency cycle – waiting',
  h_eta: '~{n} min to target', h_timeline: 'heating periods',
  h_all_away: 'All away', h_all_eco: 'All eco',
  h_set_failed: 'Could not change the climate setting',
  layout: 'Layout', layout_tiles: 'Tiles with ring gauges', layout_list: 'List with expandable rows',
  h_all_auto: 'All automatic', h_target: 'target {t}°', h_now: 'now', h_close: 'Close',
  st_heating: 'Heating', st_idle: 'Idle', st_off: 'Off', st_door: 'Door open', st_relay: 'Relay not responding',
  st_noreading: 'No reading', st_overheat: 'Overheat protection', st_limp: 'Emergency cycle',
  h_on_below: 'Switches on below', h_off_above: 'Switches off above', h_target_label: 'Target', h_current: 'Now',
  h_set_target: 'Target temperature', h_lower: 'Lower', h_higher: 'Higher', h_history: 'Last {h} hours',
  h_chart_temp: 'Temperature', h_chart_target: 'Target', h_chart_heat: 'Heating', h_details: 'Details',
  h_today_heated: 'Heated {d}', h_sheet_failed: 'Could not change the zone',
});
Object.assign(GS_I18N.hu, {
  h_title: 'Fűtés', h_entity: 'Áttekintő szenzor (SmartHeatZones)',
  h_boiler_on: 'A kazán megy', h_boiler_off: 'A kazán áll', h_since: '{t} óta', h_held_by: 'tartja',
  h_starts: 'indítás', h_runtime: 'üzemidő', h_afterheat_joins: 'utánfűtés', h_counters_since: 'számlálás kezdete: {t}',
  h_boiler_failed: 'A kazánparancs nem sikerült', h_chip_afterheat: 'utánfűtés',
  h_src_backup: 'tartalék érzékelő', h_src_limp: 'vészüzem',
  h_next: 'Következő: {temp}° ekkor: {at}', h_unavailable: 'Az áttekintés nem elérhető', h_schema_new: 'A SmartHeatZones adat (séma: {n}) újabb, mint a kártya: frissítsd a GlowStatot.',
  h_sensors_ok: 'Érzékelők: {a} / {t} él', h_backup_zones: '{n} tartalék érzékelőn', h_relay_faults: '{n} relé hiba',
  show_timeline: 'Idővonalak megjelenítése', show_eta: 'Cél eléréséig hátralévő idő', show_actions: 'Gyorsműveletek megjelenítése',
  r_needs_heat: 'Hideg – fűtésre szorul', r_holding: 'Fűt {off_above}°-ig',
  r_afterheat: 'Rátapad a már működő kazánra', r_in_band: 'Pihen – {on_below}° alatt fűt, cél {target}°',
  r_target_reached: 'Cél ({target}°) elérve', r_door_open: 'Ajtó vagy ablak nyitva', r_hvac_off: 'Kikapcsolva',
  r_no_reading: 'Nincs hőmérséklet-adat', r_overheat: 'Túlmelegedés-védelem',
  r_limp_heating: 'Vészüzem – most fűt', r_limp_waiting: 'Vészüzem – következő fűtés {next_in_min} perc múlva',
  r_limp_waiting_none: 'Vészüzem – várakozik',
  h_eta: '~{n} perc a célig', h_timeline: 'fűtési időszakok',
  h_all_away: 'Mind távol', h_all_eco: 'Mind eco',
  h_set_failed: 'A beállítás módosítása nem sikerült',
  layout: 'Elrendezés', layout_tiles: 'Csempék gyűrűs hőmérővel', layout_list: 'Lista kinyitható sorokkal',
  h_all_auto: 'Mind automata', h_target: 'cél {t}°', h_now: 'most', h_close: 'Bezár',
  st_heating: 'Fűt', st_idle: 'Pihen', st_off: 'Kikapcsolva', st_door: 'Ajtó nyitva', st_relay: 'A relé nem válaszol',
  st_noreading: 'Nincs adat', st_overheat: 'Túlmelegedés-védelem', st_limp: 'Vészüzem',
  h_on_below: 'Bekapcsol ez alatt', h_off_above: 'Kikapcsol ez felett', h_target_label: 'Cél', h_current: 'Most',
  h_set_target: 'Célhőmérséklet', h_lower: 'Alacsonyabb', h_higher: 'Magasabb', h_history: 'Az utolsó {h} óra',
  h_chart_temp: 'Hőmérséklet', h_chart_target: 'Cél', h_chart_heat: 'Fűtés', h_details: 'Részletek',
  h_today_heated: 'Fűtött: {d}', h_sheet_failed: 'A zóna módosítása nem sikerült',
});

/** A temperature without a trailing ".0" (21 -> "21", 20.5 -> "20.5"), in the card language. */
function gsHeatDeg(L, value) {
  const v = Number(value);
  return gsNum(L, v, v % 1 ? 1 : 0);
}

/**
 * Translated reason of a zone. The reason is {code, ...params}; an unknown code is shown as is,
 * so a newer integration never produces an empty line.
 */
function gsHeatReason(L, reason) {
  if (!reason || !reason.code) return '';
  let key = 'r_' + reason.code;
  if (reason.code === 'limp_waiting' && (reason.next_in_min === null || reason.next_in_min === undefined)) key = 'r_limp_waiting_none';
  const template = gsT(L, key);
  if (template === key) return String(reason.code);
  return template.replace(/\{(\w+)\}/g, (m, name) => (
    reason[name] === undefined || reason[name] === null ? '' : (name === 'next_in_min' ? String(reason[name]) : gsHeatDeg(L, reason[name]))
  ));
}

/** Local "HH:MM" of an ISO time ('' for an invalid one). */
function gsHeatClock(L, iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleTimeString(L.language, { hour: '2-digit', minute: '2-digit' });
}

/** "1 h 30 min" / "12 min" from seconds. */
function gsHeatDuration(seconds) {
  const m = Math.floor(Math.max(0, Number(seconds) || 0) / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

/**
 * Heating periods inside [from, to] (ms) from a history of {state: 'on'|'off', last_changed}.
 * The first entry may start before `from` (the history request returns the state at its start).
 * @returns {Array<{start: number, end: number, on: boolean}>}
 */
function gsHeatSegments(history, from, to) {
  const pts = (history || [])
    .map((h) => ({ t: Date.parse(h.last_changed), on: h.state === 'on' }))
    .filter((p) => !isNaN(p.t))
    .sort((a, b) => a.t - b.t);
  const out = [];
  pts.forEach((p, i) => {
    const start = Math.max(from, p.t);
    const end = Math.min(to, i + 1 < pts.length ? pts[i + 1].t : to);
    if (end > start) out.push({ start, end, on: p.on });
  });
  return out;
}

/**
 * Minutes until `target` is reached, from the last 60 minutes of a sensor history, or null when
 * the trend is not clear: needs at least 6 points over at least 20 minutes, a slope between 0.2
 * and 6 °C/h (least squares), a current value below the target and a result of at most 480 minutes.
 * @param {Array<{t: number, v: number}>} points Sensor history (t in ms).
 */
function gsEta(points, target, now) {
  const pts = (points || [])
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v) && p.t >= now - 3600000 && p.t <= now)
    .sort((a, b) => a.t - b.t);
  if (pts.length < 6 || pts[pts.length - 1].t - pts[0].t < 20 * 60000) return null;
  const last = pts[pts.length - 1];
  if (!(last.v < target)) return null;
  const t0 = pts[0].t;
  const n = pts.length;
  let sx = 0; let sy = 0; let sxy = 0; let sxx = 0;
  pts.forEach((p) => {
    const x = (p.t - t0) / 3600000;
    sx += x; sy += p.v; sxy += x * p.v; sxx += x * x;
  });
  const denom = n * sxx - sx * sx;
  if (!denom) return null;
  const slope = (n * sxy - sx * sy) / denom; // °C per hour
  if (!(slope >= 0.2 && slope <= 6)) return null;
  const minutes = Math.round(((target - last.v) / slope) * 60);
  return minutes > 0 && minutes <= 480 ? minutes : null;
}

/**
 * Visual state of a zone: `bad` (relay fault), `warn` (door open, no reading, overheat), `heat`
 * (heating now), `off` (switched off) or `idle`; `title` is the translation key of its short name.
 */
function gsHeatState(z) {
  const code = z.reason && z.reason.code;
  if (Array.isArray(z.relay_fault) && z.relay_fault.length) return { cls: 'bad', title: 'st_relay' };
  if (code === 'door_open') return { cls: 'warn', title: 'st_door' };
  if (code === 'no_reading') return { cls: 'warn', title: 'st_noreading' };
  if (code === 'overheat') return { cls: 'warn', title: 'st_overheat' };
  if (z.hvac_action === 'heating') return { cls: 'heat', title: code === 'limp_heating' ? 'st_limp' : 'st_heating' };
  if (z.hvac_mode === 'off' || code === 'hvac_off') return { cls: 'off', title: 'st_off' };
  return { cls: 'idle', title: 'st_idle' };
}

/**
 * Ring gauge (270 degree arc): the filled arc is the current temperature, the pale band the
 * switch-on/off limits, the white dot the target. `unit` picks the scale (10..30 C or 50..86 F).
 * @param {object} z Overview zone.
 * @param {string} cls Status class (heat, idle, warn, bad, off) that colors the arc.
 */
function gsHeatGauge(L, z, cls, unit, size, mini) {
  const f = unit === '°F';
  const min = f ? 50 : 10;
  const max = f ? 86 : 30;
  const start = 135;
  const sweep = 270;
  const ang = (t) => start + (sweep * (Math.max(min, Math.min(max, Number(t))) - min)) / (max - min);
  const pt = (deg) => [60 + 48 * Math.cos((deg * Math.PI) / 180), 60 + 48 * Math.sin((deg * Math.PI) / 180)];
  const arc = (d0, d1) => {
    const a = pt(d0); const b = pt(d1);
    return `M${a[0].toFixed(2)} ${a[1].toFixed(2)} A48 48 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
  };
  const has = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));
  const target = z.adjusted_target ?? z.target;
  let svg = `<path d="${arc(start, start + sweep)}" fill="none" stroke="var(--divider-color)" stroke-width="9" stroke-linecap="round"/>`;
  if (has(z.on_below) && has(z.off_above)) svg += `<path class="band" d="${arc(ang(z.on_below), ang(z.off_above))}" fill="none" stroke-width="9" stroke-opacity="0.3"/>`;
  if (has(z.current)) svg += `<path class="fill" d="${arc(start, ang(z.current))}" fill="none" stroke-width="9" stroke-linecap="round"/>`;
  if (has(target)) { const p = pt(ang(target)); svg += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="6.5" fill="var(--card-background-color, #fff)" stroke="var(--primary-text-color)" stroke-width="2.5"/>`; }
  const cur = has(z.current) ? gsNum(L, Number(z.current), 1) : '–';
  svg += `<text class="gv" x="60" y="${mini ? 70 : 66}" text-anchor="middle" font-size="${mini ? 30 : 25}">${gsEsc(cur)}</text>`;
  if (!mini && has(target)) svg += `<text class="gs" x="60" y="83" text-anchor="middle" font-size="10.5">${gsEsc(gsT(L, 'h_target').replace('{t}', gsNum(L, Number(target), 1)))}</text>`;
  return `<svg class="gauge st-${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="${gsEsc(cur + ' ' + unit)}">${svg}</svg>`;
}

/**
 * 24 hour chart of a zone: temperature line (filled), target steps and heating bands on one scale.
 * @param {Array<{state: string, last_changed: string, cur: ?number, tgt: ?number}>} data Zone history.
 * @returns {string} SVG markup, or '' when there are fewer than two temperature points.
 */
function gsHeatChart(L, data, from, to) {
  const rows = (data || []).map((p) => ({ t: Date.parse(p.last_changed), cur: Number(p.cur), tgt: Number(p.tgt), on: p.state === 'on', hc: p.cur !== null && p.cur !== undefined, ht: p.tgt !== null && p.tgt !== undefined }))
    .filter((p) => Number.isFinite(p.t)).sort((a, b) => a.t - b.t);
  const cur = rows.filter((p) => p.hc && Number.isFinite(p.cur));
  if (cur.length < 2 || !(to > from)) return '';
  const tgt = rows.filter((p) => p.ht && Number.isFinite(p.tgt));
  const all = cur.map((p) => p.cur).concat(tgt.map((p) => p.tgt));
  const lo = Math.floor(Math.min(...all) / 2) * 2 - 2;
  const hi = Math.ceil(Math.max(...all) / 2) * 2 + 2;
  const W = 560; const H = 230; const l = 34; const r = 10; const top = 12; const b = 44;
  const pw = W - l - r; const ph = H - top - b;
  const X = (t) => (l + (pw * (Math.max(from, Math.min(to, t)) - from)) / (to - from)).toFixed(1);
  const Y = (v) => (top + ph * (1 - (v - lo) / (hi - lo))).toFixed(1);
  let out = '';
  for (let v = lo; v <= hi; v += 2) out += `<line x1="${l}" x2="${W - r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--divider-color)"/><text x="${l - 6}" y="${(Number(Y(v)) + 3.5).toFixed(1)}" text-anchor="end">${v}°</text>`;
  const hours = Math.round((to - from) / 3600000);
  const step = hours > 36 ? 12 : hours > 12 ? 6 : 3;
  for (let h = 0; h <= hours; h += step) {
    const t = from + h * 3600000;
    out += `<text x="${X(t)}" y="${H - 6}" text-anchor="${h === 0 ? 'start' : h + step > hours ? 'end' : 'middle'}">${gsEsc(new Date(t).toLocaleTimeString(L.language, { hour: '2-digit', minute: '2-digit' }))}</text>`;
  }
  const bands = [];
  gsHeatSegments(rows.map((p) => ({ state: p.on ? 'on' : 'off', last_changed: new Date(p.t).toISOString() })), from, to).filter((g) => g.on).forEach((g) => {
    const last = bands[bands.length - 1];
    if (last && g.start <= last.end) last.end = Math.max(last.end, g.end);
    else bands.push({ start: g.start, end: g.end });
  });
  bands.forEach((g) => {
    out += `<rect class="hb" x="${X(g.start)}" y="${H - b + 8}" width="${Math.max(2, Number(X(g.end)) - Number(X(g.start))).toFixed(1)}" height="10" rx="2"/>`;
  });
  let line = `M${X(cur[0].t)} ${Y(cur[0].cur)}`;
  cur.forEach((p) => { line += `L${X(p.t)} ${Y(p.cur)}`; });
  out += `<path class="area" d="${line}L${X(cur[cur.length - 1].t)} ${top + ph}L${X(cur[0].t)} ${top + ph}Z"/>`;
  if (tgt.length) {
    let d = `M${X(tgt[0].t)} ${Y(tgt[0].tgt)}`;
    tgt.forEach((p, i) => { if (i) d += `H${X(p.t)}V${Y(p.tgt)}`; });
    d += `H${X(to)}`;
    out += `<path class="tg" d="${d}" fill="none" stroke-width="2" stroke-dasharray="5 4"/>`;
  }
  out += `<path class="tc" d="${line}" fill="none" stroke-width="2.5" stroke-linejoin="round"/>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${gsEsc(gsT(L, 'h_chart_temp'))}">${out}</svg>`;
}

const GS_HEAT_CSS = `
  :host { display: block; --h-heat: 255,112,67; --h-idle: 66,165,245; --h-warn: 255,174,0; --h-bad: 239,83,80; --h-off: 140,150,165; --h-ok: 67,160,71; }
  ha-card { display: block; overflow: hidden; }
  .wrap { padding: 12px; display: grid; gap: 10px; }
  button { font: inherit; color: inherit; }
  .boiler { display: grid; gap: 2px; padding: 12px; border-radius: 14px; border: 1px solid var(--divider-color); position: relative; padding-left: 68px; min-height: 68px; align-content: center; }
  .boiler::before { content: ''; position: absolute; left: 12px; top: 50%; width: 44px; height: 44px; margin-top: -22px; border-radius: 50%; background: rgb(var(--h-off)); opacity: 0.35; }
  .boiler.on::before { background: rgb(var(--h-heat)); opacity: 1; }
  .bicon { position: absolute; left: 12px; top: 50%; width: 44px; height: 44px; margin-top: -22px; display: grid; place-items: center; color: var(--secondary-text-color); --mdc-icon-size: 24px; }
  .boiler.on .bicon { color: #fff; }
  .boiler.on { border-color: rgba(var(--h-heat), 0.6); background: rgba(var(--h-heat), 0.08); }
  .boiler.fault { border-color: rgb(var(--h-bad)); background: rgba(var(--h-bad), 0.12); }
  .bstate { font-weight: 600; font-size: 16px; }
  .bsince, .bheld, .bcount, .bcsince { font-size: 12.5px; color: var(--secondary-text-color); }
  .bfail { font-size: 12.5px; font-weight: 600; color: rgb(var(--h-bad)); }
  .boiler .tl { margin-top: 6px; }
  .zones.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
  .zones.list { display: grid; gap: 8px; }
  .zone { border-radius: 16px; border: 1px solid var(--divider-color); background: var(--card-background-color); min-width: 0; }
  .zone.warn { border-color: rgba(var(--h-warn), 0.8); }
  .zone.fault { border-color: rgb(var(--h-bad)); background: rgba(var(--h-bad), 0.08); }
  .zone.flash { animation: heatflash 1s ease-in-out 6; }
  @keyframes heatflash { 0%,100% { box-shadow: none; } 50% { box-shadow: 0 0 12px 2px rgba(var(--h-bad), 0.7); } }
  @media (prefers-reduced-motion: reduce) { .zone.flash { animation: none; box-shadow: 0 0 0 2px rgb(var(--h-bad)); } }
  .zhit { display: grid; gap: 6px; padding: 12px; width: 100%; background: none; border: 0; cursor: pointer; text-align: left; border-radius: 16px; }
  .zhit:focus-visible, .act:focus-visible, .x:focus-visible, .pbtn:focus-visible, .rowhit:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .zones.tiles .zhit { justify-items: center; text-align: center; }
  .ztop { display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%; }
  .zname { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .gauge .fill { stroke: rgb(var(--h-idle)); } .gauge .band { stroke: rgb(var(--h-idle)); }
  .gauge.st-heat .fill, .gauge.st-heat .band { stroke: rgb(var(--h-heat)); }
  .gauge.st-warn .fill, .gauge.st-warn .band { stroke: rgb(var(--h-warn)); }
  .gauge.st-bad .fill, .gauge.st-bad .band { stroke: rgb(var(--h-bad)); }
  .gauge.st-off .fill, .gauge.st-off .band { stroke: rgb(var(--h-off)); }
  .gauge .gv { fill: var(--primary-text-color); font-weight: 700; font-variant-numeric: tabular-nums; }
  .gauge .gs { fill: var(--secondary-text-color); }
  .sent { font-size: 12.5px; line-height: 1.35; color: var(--secondary-text-color); }
  .sent b { display: block; color: var(--primary-text-color); font-weight: 600; font-size: 13px; }
  .reason { display: block; }
  .badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; border-radius: 999px; padding: 3px 10px; white-space: nowrap; }
  .badge::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .badge.heat { background: rgba(var(--h-heat), 0.16); color: rgb(var(--h-heat)); }
  .badge.idle { background: rgba(var(--h-idle), 0.16); color: rgb(var(--h-idle)); }
  .badge.warn { background: rgba(var(--h-warn), 0.2); color: rgb(var(--h-warn)); }
  .badge.bad { background: rgba(var(--h-bad), 0.16); color: rgb(var(--h-bad)); }
  .badge.ok { background: rgba(var(--h-ok), 0.16); color: rgb(var(--h-ok)); }
  .badge.off { background: rgba(var(--h-off), 0.2); color: var(--secondary-text-color); }
  .chip { font-size: 11px; padding: 1px 8px; border-radius: 10px; background: color-mix(in srgb, var(--primary-color) 20%, transparent); }
  .zone.warn .chip { background: rgba(var(--h-warn), 0.25); }
  .pset { font-size: 11.5px; color: var(--secondary-text-color); }
  .ztemp { font-size: 12.5px; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
  .rowhit { display: flex; align-items: center; gap: 12px; padding: 10px 12px; width: 100%; background: none; border: 0; cursor: pointer; text-align: left; border-radius: 16px; }
  .rowhit .mid { flex: 1; min-width: 0; display: grid; gap: 2px; }
  .rowhit .nm { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .chev { color: var(--secondary-text-color); transition: transform .15s; flex: none; }
  .zone.open .chev { transform: rotate(90deg); }
  .zbody { display: none; padding: 2px 14px 14px; border-top: 1px solid var(--divider-color); gap: 10px; }
  .zone.open .zbody { display: grid; }
  .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-top: 10px; }
  .fact { background: var(--secondary-background-color); border-radius: 10px; padding: 8px 10px; }
  .fact span { display: block; font-size: 11.5px; color: var(--secondary-text-color); }
  .fact b { font-weight: 600; font-size: 14px; font-variant-numeric: tabular-nums; }
  .bar { position: relative; height: 8px; border-radius: 4px; background: var(--divider-color); margin: 4px 0; }
  .bar .band { position: absolute; top: 0; bottom: 0; background: rgba(0,168,28,0.35); border-radius: 4px; }
  .bar .t-on, .bar .t-off { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--secondary-text-color); }
  .bar .t-cur { position: absolute; top: -3px; width: 10px; height: 14px; margin-left: -5px; border-radius: 5px; background: var(--primary-color); }
  .tl { position: relative; height: 12px; border-radius: 6px; background: var(--divider-color); overflow: hidden; }
  .tl .seg { position: absolute; top: 0; bottom: 0; background: rgb(var(--h-heat)); }
  .eta { font-size: 12.5px; font-weight: 500; }
  .next { font-size: 12.5px; color: var(--secondary-text-color); }
  .health { display: flex; flex-wrap: wrap; gap: 6px; }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .act, .pbtn { flex: 1; min-width: 90px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px; border-radius: 14px; cursor: pointer; user-select: none; font-size: 13px; border: 1px solid var(--divider-color); background: var(--secondary-background-color); }
  .act:active, .pbtn:active { background: color-mix(in srgb, var(--primary-color) 18%, transparent); }
  .pbtn.on { background: var(--primary-color); border-color: var(--primary-color); color: var(--text-primary-color, #fff); }
  .act ha-icon { --mdc-icon-size: 20px; }
  .hint { padding: 10px; font-size: 13px; color: var(--secondary-text-color); }
  .sbg { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 9; }
  @media (min-width: 700px) { .sbg { align-items: center; } }
  .sheet { background: var(--card-background-color); color: var(--primary-text-color); width: 100%; max-width: 640px; max-height: 92vh; overflow: auto; border-radius: 20px 20px 0 0; padding: 16px; display: grid; gap: 14px; }
  @media (min-width: 700px) { .sheet { border-radius: 20px; } }
  .sh { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .sh h2 { margin: 0; font-size: 20px; }
  .x { width: 34px; height: 34px; border-radius: 50%; border: 0; background: var(--secondary-background-color); cursor: pointer; font-size: 18px; }
  .big { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
  .big .txt { flex: 1; min-width: 170px; display: grid; gap: 8px; }
  .stepper { display: inline-flex; align-items: center; gap: 12px; background: var(--secondary-background-color); border-radius: 12px; padding: 6px; justify-self: start; }
  .stepper button { width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--divider-color); background: var(--card-background-color); cursor: pointer; font-size: 20px; }
  .stepper b { min-width: 64px; text-align: center; font-size: 20px; font-variant-numeric: tabular-nums; }
  .lbl { font-size: 11.5px; color: var(--secondary-text-color); margin-bottom: 4px; }
  .chart { width: 100%; height: auto; display: block; }
  .chart text { fill: var(--secondary-text-color); font-size: 10.5px; }
  .chart .tc { stroke: rgb(var(--h-idle)); } .chart .tg { stroke: rgb(var(--h-warn)); }
  .chart .area { fill: rgba(var(--h-idle), 0.12); } .chart .hb { fill: rgb(var(--h-heat)); opacity: 0.85; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: var(--secondary-text-color); margin-top: 6px; }
  .legend i { display: inline-block; width: 14px; height: 3px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
`;

class GlowStatHeatingCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._sig = '';
    this.shadowRoot.addEventListener('click', (ev) => this._onClick(ev));
    this.shadowRoot.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && this._open) this._closeSheet();
    });
  }

  connectedCallback() {
    this._subscribe();
  }

  /** Stop listening for fail-safe events (a subscription that is still pending is dropped when it resolves). */
  disconnectedCallback() {
    this._subToken = null;
    this._subState = null;
    const unsub = this._unsub;
    this._unsub = null;
    if (typeof unsub === 'function') this._runUnsub(unsub);
  }

  _runUnsub(unsub) {
    try {
      unsub();
    } catch (e) {
      console.error('GlowStat: cannot stop the event subscription', e);
    }
  }

  /**
   * Subscribe once to the smartheatzones_failsafe event (needs an admin user; without one the
   * subscription is rejected, which is warned about once and only costs the flash).
   */
  _subscribe() {
    const conn = this._hass && this._hass.connection;
    if (this._subState || !this.isConnected || !conn || typeof conn.subscribeEvents !== 'function') return;
    this._subState = 'pending';
    const token = {};
    this._subToken = token;
    let request;
    try {
      request = Promise.resolve(conn.subscribeEvents((ev) => this._onFailsafe(ev), 'smartheatzones_failsafe'));
    } catch (e) {
      request = Promise.reject(e);
    }
    request.then((unsub) => {
      if (this._subToken !== token) this._runUnsub(unsub);
      else { this._unsub = unsub; this._subState = 'active'; }
    }).catch((e) => {
      if (this._subToken !== token) return;
      this._subState = 'failed';
      console.warn('GlowStat: the fail-safe event subscription was refused (admin users only), the zone flash is off', e);
    });
  }

  /** Flash the row of the zone the event names for 6 seconds. */
  _onFailsafe(ev) {
    const zone = ev && ev.data && ev.data.zone;
    if (!zone) return;
    this._flash = String(zone);
    this._sig = '';
    this._paint();
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      this._flash = null;
      this._sig = '';
      this._paint();
    }, 6000);
  }

  static getConfigElement() {
    return document.createElement('glowstat-heating-card-editor');
  }

  static getStubConfig() {
    return { entity: 'sensor.smartheatzones_overview' };
  }

  setConfig(config) {
    if (!config || !config.entity) throw new Error('GlowStat: "entity" is required');
    this._config = { ...config };
    this._open = null;
    this._expanded = {};
    this._sig = '';
    this._hist = {};
    this._paint();
    this._loadHistory();
    this._subscribe();
  }

  set hass(hass) {
    this._hass = hass;
    const sig = this._signature();
    if (sig !== this._sig) {
      this._sig = sig;
      this._paint();
    }
    this._loadHistory();
    this._subscribe();
  }

  getCardSize() {
    const st = this._hass && this._config && this._hass.states[this._config.entity];
    return 2 + ((st && st.attributes && st.attributes.zones) || []).length;
  }

  getGridOptions() {
    return { columns: 12, rows: 'auto', min_columns: 6 };
  }

  _signature() {
    if (!this._hass || !this._config) return '';
    const st = this._hass.states[this._config.entity];
    return [st ? st.state + JSON.stringify(st.attributes) : '∅', gsLangObj(this._hass, this._config).language].join('|');
  }

  /** History keys the card needs now: [{key, entity, kind, ms}]. */
  _wanted() {
    const cfg = this._config;
    const st = this._hass && this._hass.states[cfg.entity];
    const a = st && st.attributes;
    if (!a || !Array.isArray(a.zones) || !a.boiler) return [];
    const hours = Math.min(72, Math.max(1, Number(cfg.history_hours) || 24));
    const want = [];
    if (cfg.show_timeline !== false) {
      a.zones.forEach((z) => want.push({ key: 'z|' + z.entity_id, entity: z.entity_id, kind: 'zone', ms: hours * 3600000 }));
      if (a.boiler.entity) want.push({ key: 'b|' + a.boiler.entity, entity: a.boiler.entity, kind: 'boiler', ms: hours * 3600000 });
    }
    if (cfg.show_eta !== false) {
      a.zones.filter((z) => z.hvac_action === 'heating' && z.sensor_entity)
        .forEach((z) => want.push({ key: 's|' + z.sensor_entity, entity: z.sensor_entity, kind: 'sensor', ms: 70 * 60000 }));
    }
    return want;
  }

  /** Request the history that is missing or older than GS_HEAT_REFRESH_MS (failed ones are retried after a minute). */
  _loadHistory() {
    if (!this._hass || !this._config) return;
    const hass = this._hass;
    this._hist = this._hist || {};
    this._wanted().forEach((w) => {
      const entry = this._hist[w.key];
      if (entry && (entry.busy || Date.now() - entry.t < (entry.err ? GS_HEAT_RETRY_MS : GS_HEAT_REFRESH_MS))) return;
      const mine = { ...(entry || {}), busy: true, t: Date.now(), err: false };
      this._hist[w.key] = mine;
      const end = Date.now();
      const start = end - w.ms;
      const url = 'history/period/' + new Date(start).toISOString()
        + '?filter_entity_id=' + encodeURIComponent(w.entity)
        + '&end_time=' + encodeURIComponent(new Date(end).toISOString())
        + (w.kind === 'zone' ? '&significant_changes_only=0' : '&minimal_response&no_attributes&significant_changes_only=0');
      Promise.resolve().then(() => hass.callApi('GET', url)).then((r) => {
        const rows = (r && r[0]) || [];
        const when = (p) => p.last_changed || p.last_updated;
        if (w.kind === 'zone') mine.data = rows.map((p) => ({ state: p.attributes && p.attributes.hvac_action === 'heating' ? 'on' : 'off', last_changed: when(p), cur: p.attributes ? p.attributes.current_temperature : null, tgt: p.attributes ? p.attributes.temperature : null }));
        else if (w.kind === 'boiler') mine.data = rows.map((p) => ({ state: p.state, last_changed: when(p) }));
        else mine.data = rows.map((p) => ({ t: Date.parse(when(p)), v: parseFloat(p.state) })).filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v));
        mine.from = start;
        mine.to = end;
      }).catch((e) => {
        mine.err = true;
        console.error('GlowStat: heating history request failed for ' + w.entity, e);
      }).finally(() => {
        mine.busy = false;
        mine.t = Date.now();
        this._sig = '';
        this._paint();
      });
    });
  }

  /** Bar of the heating periods for a history key, or '' without history. */
  _timelineHtml(key, L) {
    const entry = this._hist && this._hist[key];
    if (!entry || !entry.data || !entry.data.length) return '';
    const span = entry.to - entry.from;
    const segs = gsHeatSegments(entry.data, entry.from, entry.to).filter((g) => g.on).map((g) => (
      `<div class="seg" style="left:${(((g.start - entry.from) / span) * 100).toFixed(2)}%;width:${(((g.end - g.start) / span) * 100).toFixed(2)}%"></div>`
    ));
    return `<div class="tl" role="img" aria-label="${gsEsc(gsT(L, 'h_timeline'))}">${segs.join('')}</div>`;
  }

  /** Minutes to the target for a heating zone with a clear rising trend, else null. */
  _etaMinutes(z) {
    if (this._config.show_eta === false || z.hvac_action !== 'heating' || z.adjusted_target === null || z.adjusted_target === undefined) return null;
    const entry = this._hist && this._hist['s|' + z.sensor_entity];
    return entry && entry.data ? gsEta(entry.data, Number(z.adjusted_target), Date.now()) : null;
  }

  /** "~25 min to target" for a heating zone with a clear rising trend, else ''. */
  _etaHtml(z, L) {
    const minutes = this._etaMinutes(z);
    return minutes === null ? '' : `<div class="eta">${gsEsc(gsT(L, 'h_eta').replace('{n}', String(minutes)))}</div>`;
  }

  /** Shared parts of a zone: state, classes, source chip, sentence, and the next change line. */
  _zoneParts(z, L) {
    const state = gsHeatState(z);
    const cls = ['zone'];
    if (this._flash === z.name) cls.push('flash');
    if (Array.isArray(z.relay_fault) && z.relay_fault.length) cls.push('fault');
    else if (z.sensor_source === 'backup' || z.sensor_source === 'none' || z.sensor_fault) cls.push('warn');
    let chip = '';
    if (z.joined) chip = gsT(L, 'h_chip_afterheat');
    else if (z.sensor_source === 'backup') chip = gsT(L, 'h_src_backup');
    else if (z.sensor_source === 'none') chip = gsT(L, 'h_src_limp');
    const pk = 'p_' + z.preset;
    const pt = z.preset ? gsT(L, pk) : '';
    return {
      state, cls, chip,
      preset: pt === pk ? String(z.preset || '') : pt,
      title: gsT(L, state.title),
      reason: gsHeatReason(L, z.reason),
      next: z.next_change
        ? `<div class="next">${gsEsc(gsT(L, 'h_next').replace('{temp}', gsHeatDeg(L, z.next_change.temp)).replace('{at}', z.next_change.at))}</div>` : '',
    };
  }

  /** Attribute string that identifies a zone element. */
  _zoneAttrs(z, parts) {
    return `class="${parts.cls.join(' ')}${this._expanded[z.entity_id] ? ' open' : ''}" data-name="${gsEsc(z.name)}" data-entity="${gsEsc(z.entity_id)}"`;
  }

  /** A zone as a tile: name, ring gauge, one sentence and the preset. Opens the zone sheet. */
  _tileHtml(z, L, unit) {
    const parts = this._zoneParts(z, L);
    return `<div ${this._zoneAttrs(z, parts)}>
      <button class="zhit" data-open="${gsEsc(z.entity_id)}" aria-label="${gsEsc(z.name + ': ' + parts.title)}">
        <div class="ztop"><span class="zname">${gsEsc(z.name)}</span>${parts.chip ? `<span class="chip">${gsEsc(parts.chip)}</span>` : ''}</div>
        ${gsHeatGauge(L, z, parts.state.cls, unit, 118, false)}
        <div class="sent"><b>${gsEsc(parts.title)}</b><span class="reason">${gsEsc(parts.reason)}</span></div>
        ${this._etaHtml(z, L)}
        <div><span class="badge ${parts.state.cls}">${gsEsc(parts.preset || parts.title)}</span></div>
      </button></div>`;
  }

  /** A zone as a row: mini gauge and sentence; the row opens to limits, next change, timeline and the sheet button. */
  _rowHtml(z, L, unit) {
    const parts = this._zoneParts(z, L);
    const num = (v) => (v === null || v === undefined ? '–' : gsNum(L, Number(v), 1));
    const target = z.adjusted_target ?? z.target;
    const values = [z.on_below, z.off_above, z.target, z.current].filter((v) => v !== null && v !== undefined).map(Number);
    const lo = Math.min(...values) - 1.5;
    const hi = Math.max(...values) + 1.5;
    const pos = (v) => Math.max(0, Math.min(100, ((Number(v) - lo) / (hi - lo)) * 100)).toFixed(1);
    const hasBand = z.on_below !== null && z.on_below !== undefined && z.off_above !== null && z.off_above !== undefined;
    const bar = `<div class="bar">${hasBand ? `<div class="band" style="left:${pos(z.on_below)}%;width:${(pos(z.off_above) - pos(z.on_below)).toFixed(1)}%"></div><div class="t-on" style="left:${pos(z.on_below)}%"></div><div class="t-off" style="left:${pos(z.off_above)}%"></div>` : ''}${z.current !== null && z.current !== undefined ? `<div class="t-cur" style="left:${pos(z.current)}%"></div>` : ''}</div>`;
    const fact = (label, value) => `<div class="fact"><span>${gsEsc(label)}</span><b>${gsEsc(value)}</b></div>`;
    const facts = [fact(gsT(L, 'h_current'), `${num(z.current)} ${unit}`), fact(gsT(L, 'h_target_label') + (parts.preset ? ` (${parts.preset})` : ''), `${num(target)} ${unit}`)];
    if (hasBand) facts.push(fact(gsT(L, 'h_on_below'), `${num(z.on_below)} ${unit}`), fact(gsT(L, 'h_off_above'), `${num(z.off_above)} ${unit}`));
    return `<div ${this._zoneAttrs(z, parts)}>
      <button class="rowhit" data-toggle="${gsEsc(z.entity_id)}" aria-expanded="${this._expanded[z.entity_id] ? 'true' : 'false'}">
        ${gsHeatGauge(L, z, parts.state.cls, unit, 58, true)}
        <div class="mid"><div class="nm"><span class="zname">${gsEsc(z.name)}</span><span class="badge ${parts.state.cls}">${gsEsc(parts.title)}</span>${parts.chip ? `<span class="chip">${gsEsc(parts.chip)}</span>` : ''}</div>
          <div class="sent"><span class="reason">${gsEsc(parts.reason)}</span></div>
          <span class="ztemp">${num(z.current)} → ${num(target)} ${gsEsc(unit)}</span></div>
        <span class="chev"><ha-icon icon="mdi:chevron-right"></ha-icon></span></button>
      <div class="zbody"><div class="facts">${facts.join('')}</div>${bar}${this._etaHtml(z, L)}${parts.next}${this._timelineHtml('z|' + z.entity_id, L)}
        <div class="actions"><button class="act" data-open="${gsEsc(z.entity_id)}">${gsEsc(gsT(L, 'h_details'))}</button></div></div></div>`;
  }

  _zoneHtml(z, L, unit) {
    return this._config.layout === 'list' ? this._rowHtml(z, L, unit) : this._tileHtml(z, L, unit);
  }

  /** The zone sheet: big gauge, presets, target stepper, 24 h chart and the heating timeline. */
  _sheetHtml(z, L, unit) {
    const parts = this._zoneParts(z, L);
    const target = z.target === null || z.target === undefined ? null : Number(z.target);
    const presets = ['auto', 'comfort', 'eco', 'away'].map((p) => (
      `<button class="pbtn${z.preset === p ? ' on' : ''}" data-zpreset="${p}" data-entity="${gsEsc(z.entity_id)}">${gsEsc(gsT(L, 'p_' + p))}</button>`)).join('');
    const stepper = target === null ? '' : `<div><div class="lbl">${gsEsc(gsT(L, 'h_set_target'))}</div><div class="stepper">
      <button data-step="-0.5" data-entity="${gsEsc(z.entity_id)}" aria-label="${gsEsc(gsT(L, 'h_lower'))}">−</button><b>${gsEsc(gsNum(L, target, 1))} ${gsEsc(unit)}</b>
      <button data-step="0.5" data-entity="${gsEsc(z.entity_id)}" aria-label="${gsEsc(gsT(L, 'h_higher'))}">+</button></div></div>`;
    const entry = this._hist && this._hist['z|' + z.entity_id];
    const svg = entry && entry.data ? gsHeatChart(L, entry.data, entry.from, entry.to) : '';
    const hours = entry ? Math.round((entry.to - entry.from) / 3600000) : 0;
    const chart = svg ? `<div><div class="lbl">${gsEsc(gsT(L, 'h_history').replace('{h}', String(hours)))}</div>${svg}
      <div class="legend"><span><i style="background:rgb(var(--h-idle))"></i>${gsEsc(gsT(L, 'h_chart_temp'))}</span><span><i style="background:rgb(var(--h-warn))"></i>${gsEsc(gsT(L, 'h_chart_target'))}</span><span><i style="background:rgb(var(--h-heat))"></i>${gsEsc(gsT(L, 'h_chart_heat'))}</span></div></div>` : '';
    const tl = this._timelineHtml('z|' + z.entity_id, L);
    return `<div class="sbg" data-close="1"><div class="sheet" role="dialog" aria-modal="true" aria-label="${gsEsc(z.name)}">
      <div class="sh"><h2>${gsEsc(z.name)}</h2><button class="x" data-close="1" aria-label="${gsEsc(gsT(L, 'h_close'))}">×</button></div>
      <div class="big">${gsHeatGauge(L, z, parts.state.cls, unit, 150, false)}<div class="txt">
        <div class="sent"><b>${gsEsc(parts.title)}</b><span class="reason">${gsEsc(parts.reason)}</span></div>${this._etaHtml(z, L)}${parts.next}
        <div class="health"><span class="badge ${parts.state.cls}">${gsEsc(parts.title)}</span>${parts.chip ? `<span class="chip">${gsEsc(parts.chip)}</span>` : ''}</div></div></div>
      <div class="actions">${presets}</div>${stepper}${chart}${tl}
      <div class="actions"><button class="act" data-more="${gsEsc(z.entity_id)}">${gsEsc(gsT(L, 'h_details'))}</button></div></div></div>`;
  }

  /** Summary badges: sensors alive (green, amber if some are silent), zones on a backup sensor, relay faults. */
  _healthHtml(groups, zones, L) {
    const gs = Object.values(groups || {});
    const badges = [];
    const total = gs.reduce((n, g) => n + (Number(g && g.total) || 0), 0);
    if (total > 0) {
      const bad = gs.reduce((n, g) => n + (Number(g && g.bad) || 0), 0);
      const label = gsT(L, 'h_sensors_ok').replace(/\{a\}/g, String(total - bad)).replace(/\{t\}/g, String(total));
      badges.push(`<span class="badge ${bad > 0 ? 'warn' : 'ok'}">${gsEsc(label)}</span>`);
    }
    const zs = zones || [];
    const backup = zs.filter((z) => z.sensor_source === 'backup').length;
    if (backup > 0) badges.push(`<span class="badge warn">${gsEsc(gsT(L, 'h_backup_zones').replace(/\{n\}/g, String(backup)))}</span>`);
    const faults = zs.filter((z) => Array.isArray(z.relay_fault) && z.relay_fault.length).length;
    if (faults > 0) badges.push(`<span class="badge bad">${gsEsc(gsT(L, 'h_relay_faults').replace(/\{n\}/g, String(faults)))}</span>`);
    return badges.length ? `<div class="health">${badges.join('')}</div>` : '';
  }

  /** Quick actions for all zones. */
  _actionsHtml(L) {
    if (this._config.show_actions === false) return '';
    return `<div class="actions">
      <div class="act" role="button" tabindex="0" data-preset="away"><ha-icon icon="mdi:car"></ha-icon>${gsEsc(gsT(L, 'h_all_away'))}</div>
      <div class="act" role="button" tabindex="0" data-preset="eco"><ha-icon icon="mdi:leaf"></ha-icon>${gsEsc(gsT(L, 'h_all_eco'))}</div>
      <div class="act" role="button" tabindex="0" data-preset="auto"><ha-icon icon="mdi:calendar-clock"></ha-icon>${gsEsc(gsT(L, 'h_all_auto'))}</div></div>`;
  }

  /** Tell the user a service call failed (and log it for the traces). */
  _failed(message, names, err, what) {
    console.error('GlowStat: ' + what, err);
    gsFire(this, 'hass-notification', { message: message + (names ? ' (' + names + ')' : '') });
  }

  /** Set a preset on every zone; every call is made and the zones that failed are named. */
  _setAll(preset) {
    const st = this._hass.states[this._config.entity];
    const zones = (st && st.attributes && st.attributes.zones) || [];
    const hass = this._hass;
    Promise.allSettled(zones.map((z) => Promise.resolve().then(() => hass.callService('climate', 'set_preset_mode', { entity_id: z.entity_id, preset_mode: preset }))))
      .then((results) => {
        const failed = zones.filter((z, i) => results[i].status === 'rejected');
        if (!failed.length) return;
        failed.forEach((z) => console.error('GlowStat: climate.set_preset_mode failed for ' + z.entity_id, results[zones.indexOf(z)].reason));
        gsFire(this, 'hass-notification', {
          message: gsT(gsLangObj(this._hass, this._config), 'h_set_failed') + ' (' + failed.map((z) => z.name).join(', ') + ')',
        });
      });
  }

  /** Change one zone from its sheet: a preset or a new target temperature. */
  _setZone(entity, service, data) {
    const hass = this._hass;
    const L = gsLangObj(hass, this._config);
    Promise.resolve().then(() => hass.callService('climate', service, { entity_id: entity, ...data }))
      .catch((e) => this._failed(gsT(L, 'h_sheet_failed'), entity, e, 'climate.' + service + ' failed for ' + entity));
  }

  /** Boiler header. */
  _boilerHtml(b, L) {
    const lines = [`<div class="bstate">${gsEsc(gsT(L, b.running ? 'h_boiler_on' : 'h_boiler_off'))}</div>`];
    if (b.running && b.since) lines.push(`<div class="bsince">${gsEsc(gsT(L, 'h_since').replace('{t}', gsHeatClock(L, b.since)))}</div>`);
    const held = [...(b.held_by || []), ...(b.afterheat_zones || []).map((n) => `${n} (${gsT(L, 'h_chip_afterheat')})`)];
    if (held.length) lines.push(`<div class="bheld">${gsEsc(gsT(L, 'h_held_by'))}: ${gsEsc(held.join(', '))}</div>`);
    const boilerTl = b.entity ? this._timelineHtml('b|' + b.entity, L) : '';
    lines.push(`<div class="bcount">${gsEsc(`${b.starts_today ?? 0} ${gsT(L, 'h_starts')} · ${gsHeatDuration(b.runtime_today_s)} · ${b.afterheat_joins_today ?? 0} ${gsT(L, 'h_afterheat_joins')}`)}</div>`);
    const cs = new Date(b.counters_since);
    if (!isNaN(cs) && (cs.getHours() || cs.getMinutes() || cs.getSeconds())) {
      lines.push(`<div class="bcsince">${gsEsc(gsT(L, 'h_counters_since').replace('{t}', gsHeatClock(L, b.counters_since)))}</div>`);
    }
    if (b.failed_action) lines.push(`<div class="bfail">⚠ ${gsEsc(gsT(L, 'h_boiler_failed'))}</div>`);
    return `<div class="boiler${b.running ? ' on' : ''}${b.failed_action ? ' fault' : ''}"><ha-icon class="bicon" icon="mdi:fire"></ha-icon>${lines.join('')}${boilerTl}</div>`;
  }

  _paint() {
    const hass = this._hass;
    const cfg = this._config;
    if (!hass || !cfg) return;
    const L = gsLangObj(hass, cfg);
    const shell = (inner) => gsSetHtml(this.shadowRoot, `<style>${GS_HEAT_CSS}</style><ha-card>${inner}</ha-card>`);
    const st = hass.states[cfg.entity];
    if (!st) return shell(`<div class="hint">${gsEsc(cfg.entity)}: ${gsEsc(gsT(L, 'no_data'))}</div>`);
    const a = st.attributes || {};
    if (st.state === 'unavailable' || !a.boiler || !Array.isArray(a.zones)) {
      return shell(`<div class="hint">${gsEsc(gsT(L, 'h_unavailable'))}</div>`);
    }
    const unit = hass.config?.unit_system?.temperature || '°C';
    const hint = Number(a.schema) > GS_HEAT_SCHEMA
      ? `<div class="hint">${gsEsc(gsT(L, 'h_schema_new').replace('{n}', String(a.schema)))}</div>` : '';
    const layout = cfg.layout === 'list' ? 'list' : 'tiles';
    const open = this._open && a.zones.find((z) => z.entity_id === this._open);
    shell(`<div class="wrap">${hint}${this._boilerHtml(a.boiler, L)}${this._healthHtml(a.health && a.health.groups, a.zones, L)}${this._actionsHtml(L)}<div class="zones ${layout}">${a.zones.map((z) => this._zoneHtml(z, L, unit)).join('')}</div></div>${open ? this._sheetHtml(open, L, unit) : ''}`);
  }

  _openSheet(entity) {
    this._open = entity;
    this._sig = '';
    this._paint();
    const close = this.shadowRoot.querySelector('.x');
    if (close) close.focus();
  }

  _closeSheet() {
    this._open = null;
    this._sig = '';
    this._paint();
  }

  _onClick(ev) {
    const path = ev.composedPath();
    const find = (key) => path.find((n) => n.dataset && n.dataset[key] !== undefined);
    const action = find('preset');
    if (action) { this._setAll(action.dataset.preset); return; }
    const sheetBtn = find('zpreset');
    if (sheetBtn) { this._setZone(sheetBtn.dataset.entity, 'set_preset_mode', { preset_mode: sheetBtn.dataset.zpreset }); return; }
    const step = find('step');
    if (step) {
      const st = this._hass.states[this._config.entity];
      const z = st && st.attributes && (st.attributes.zones || []).find((q) => q.entity_id === step.dataset.entity);
      if (z && z.target !== null && z.target !== undefined) {
        const next = Math.round((Number(z.target) + Number(step.dataset.step)) * 2) / 2;
        this._setZone(z.entity_id, 'set_temperature', { temperature: Math.max(5, Math.min(35, next)) });
      }
      return;
    }
    const more = find('more');
    if (more) { gsFire(this, 'hass-more-info', { entityId: more.dataset.more }); return; }
    const opener = find('open');
    if (opener) { this._openSheet(opener.dataset.open); return; }
    const toggle = find('toggle');
    if (toggle) {
      const id = toggle.dataset.toggle;
      this._expanded[id] = !this._expanded[id];
      const row = toggle.closest('.zone');
      if (row) row.classList.toggle('open', this._expanded[id]);
      toggle.setAttribute('aria-expanded', String(Boolean(this._expanded[id])));
      return;
    }
    const closer = find('close');
    if (closer && (closer.classList.contains('x') || path[0] === closer)) this._closeSheet();
  }
}

/** GUI editor for the heating card. */
class GlowStatHeatingCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
    else this._render();
  }

  _schema() {
    return [
      { name: 'entity', required: true, selector: { entity: { domain: 'sensor' } } },
      { name: 'layout', selector: { select: { mode: 'dropdown', options: ['tiles', 'list'].map((v) => ({ value: v, label: gsT(this._hass, 'layout_' + v) })) } } },
      { name: 'history_hours', selector: { number: { min: 1, max: 72, mode: 'box' } } },
      { name: 'show_timeline', selector: { boolean: {} } },
      { name: 'show_eta', selector: { boolean: {} } },
      { name: 'show_actions', selector: { boolean: {} } },
      gsLanguageField(this._hass),
    ];
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = (s) => gsT(this._hass, s.name === 'entity' ? 'h_entity' : s.name);
      this._form.addEventListener('value-changed', (ev) => {
        const next = { ...this._config, ...ev.detail.value };
        Object.keys(next).forEach((k) => {
          if (next[k] === '' || next[k] === undefined || next[k] === null) delete next[k];
        });
        this._config = next;
        gsFire(this, 'config-changed', { config: next });
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = this._schema();
    this._form.data = { language: 'auto', layout: 'tiles', history_hours: 24, show_timeline: true, show_eta: true, show_actions: true, ...this._config };
  }
}

customElements.define('glowstat-heating-card', GlowStatHeatingCard);
customElements.define('glowstat-heating-card-editor', GlowStatHeatingCardEditor);
gsRegisterCard({
  type: 'glowstat-heating-card',
  name: 'GlowStat Heating',
  description: 'Whole-house heating overview from SmartHeatZones: boiler, zones, reasons, timelines and quick actions.',
});
console.info('%c GlowStat %c v' + GS_VERSION + ' ', 'background:#00a81c;color:#fff;border-radius:3px 0 0 3px', 'background:#333;color:#fff;border-radius:0 3px 3px 0');
})();
